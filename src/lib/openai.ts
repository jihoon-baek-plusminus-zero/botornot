import OpenAI from 'openai'
import {
  OpenAIResponse,
  AIPersona,
  GenerateAIResponseRequest,
  GenerateAIResponseResponse,
  AIResponseProcessingOptions,
  AIPromptTemplate,
  AIResponseQuality,
  AIResponseCache,
  AIModelConfig,
  AIGenerationContext,
  AIResponsePostProcessing,
  PersonaPromptSettings
} from '@/types/openai'
import { PlayerLabel } from '@/types/game'
import { createServerClient } from './supabase'

// OpenAI API 키 확인
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY가 설정되지 않았습니다.')
  throw new Error('OPENAI_API_KEY 환경 변수가 필요합니다.')
}

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// AI 모델 설정
const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  max_tokens: 150,
  top_p: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.1
}

// AI 페르소나별 프롬프트 설정
const PERSONA_PROMPT_SETTINGS: Record<number, PersonaPromptSettings> = {
  1: {
    personaId: 1,
    systemPrompt: `당신은 캐주얼한 대학생입니다. 친근하고 편안한 대화를 선호하며, 가끔 오타를 내고 인터넷 밈을 사용합니다. 
    대화할 때 자연스럽고 친근한 톤을 유지하세요. 이모지를 적절히 사용하고, 가끔 오타를 내는 것도 괜찮습니다.`,
    userPromptTemplate: `현재 주제: {topic}
    게임 타입: {gameType}
    대화 히스토리:
    {history}
    
    위의 대화를 보고 자연스럽게 응답해주세요. 대학생다운 친근하고 캐주얼한 톤으로 답변하세요.`,
    responseConstraints: [
      '친근하고 캐주얼한 톤 유지',
      '자연스러운 대화 스타일',
      '적절한 이모지 사용',
      '가끔 오타 허용'
    ],
    personalityHints: [
      '대학생',
      '친근함',
      '캐주얼',
      '이모지 사용',
      '오타 가능'
    ],
    conversationStyle: 'casual'
  },
  2: {
    personaId: 2,
    systemPrompt: `당신은 신중한 직장인입니다. 조심스럽고 신중한 응답을 하며, 오타가 거의 없고 정중한 대화를 합니다.
    대화할 때 예의 바르고 신중한 톤을 유지하세요. 이모지는 최소한으로 사용하고, 정확한 맞춤법을 사용합니다.`,
    userPromptTemplate: `현재 주제: {topic}
    게임 타입: {gameType}
    대화 히스토리:
    {history}
    
    위의 대화를 보고 신중하고 정중하게 응답해주세요. 직장인다운 예의 바른 톤으로 답변하세요.`,
    responseConstraints: [
      '신중하고 정중한 톤 유지',
      '정확한 맞춤법 사용',
      '최소한의 이모지 사용',
      '오타 최소화'
    ],
    personalityHints: [
      '직장인',
      '신중함',
      '정중함',
      '정확한 맞춤법',
      '최소 이모지'
    ],
    conversationStyle: 'formal'
  }
}

// AI 응답 캐시 (메모리 기반, 실제로는 Redis 권장)
const responseCache: Map<string, AIResponseCache> = new Map()

// AI 응답 통계
let aiStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  averageTokenUsage: 0,
  personaUsage: {} as Record<number, number>,
  errorRates: {} as Record<string, number>,
  qualityMetrics: {
    averageRelevance: 0,
    averageNaturalness: 0,
    averagePersonalityConsistency: 0
  }
}

/**
 * AI 응답 생성
 */
export async function generateAIResponse(
  request: GenerateAIResponseRequest
): Promise<GenerateAIResponseResponse> {
  const startTime = Date.now()
  
  try {
    // 통계 업데이트
    aiStats.totalRequests++
    aiStats.personaUsage[request.personaId] = (aiStats.personaUsage[request.personaId] || 0) + 1

    // 캐시 확인
    const cacheKey = generateCacheKey(request)
    const cachedResponse = responseCache.get(cacheKey)
    if (cachedResponse && new Date() < new Date(cachedResponse.expiresAt)) {
      cachedResponse.usage_count++
      return {
        success: true,
        response: cachedResponse.response,
        processedResponse: cachedResponse.response,
        metadata: {
          originalLength: cachedResponse.response.length,
          processedLength: cachedResponse.response.length,
          hasTypo: false,
          hasEmoji: false,
          hasMeme: false,
          responseTime: Date.now() - startTime,
          tokenUsage: { prompt: 0, completion: 0, total: 0 }
        }
      }
    }

    // AI 페르소나 정보 조회
    const persona = await getAIPersona(request.personaId)
    if (!persona) {
      throw new Error(`AI 페르소나를 찾을 수 없습니다: ${request.personaId}`)
    }

    // 프롬프트 생성
    const prompt = generatePrompt(request, persona)
    
    // OpenAI API 호출
    const openaiResponse = await callOpenAI(prompt, request.temperature || DEFAULT_MODEL_CONFIG.temperature)
    
    if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
      throw new Error('OpenAI API에서 응답을 받지 못했습니다.')
    }

    const originalResponse = openaiResponse.choices[0].message.content.trim()
    
    // 응답 후처리
    const processedResponse = await postProcessResponse(originalResponse, persona, request)
    
    // 캐시 저장
    const processedResponseForCache = processedResponse.processedResponse
    responseCache.set(cacheKey, {
      key: cacheKey,
      response: processedResponseForCache,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5분 캐시
      usage_count: 1
    })

    // 통계 업데이트
    const responseTime = Date.now() - startTime
    aiStats.successfulRequests++
    aiStats.averageResponseTime = (aiStats.averageResponseTime + responseTime) / 2
    aiStats.averageTokenUsage = (aiStats.averageTokenUsage + openaiResponse.usage.total_tokens) / 2

    return {
      success: true,
      response: originalResponse,
      processedResponse: processedResponseForCache,
      metadata: {
        originalLength: originalResponse.length,
        processedLength: processedResponseForCache.length,
        hasTypo: processedResponse.modifications.typos.length > 0,
        hasEmoji: processedResponse.modifications.emojis.length > 0,
        hasMeme: processedResponse.modifications.memes.length > 0,
        responseTime,
        tokenUsage: {
          prompt: openaiResponse.usage.prompt_tokens,
          completion: openaiResponse.usage.completion_tokens,
          total: openaiResponse.usage.total_tokens
        }
      }
    }

  } catch (error) {
    // 에러 통계 업데이트
    aiStats.failedRequests++
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown'
    aiStats.errorRates[errorType] = (aiStats.errorRates[errorType] || 0) + 1

    console.error('AI 응답 생성 오류:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 응답 생성 중 오류가 발생했습니다.'
    }
  }
}

/**
 * AI 페르소나 조회
 */
async function getAIPersona(personaId: number): Promise<AIPersona | null> {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('ai_personas')
      .select('*')
      .eq('id', personaId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      personality: data.description, // 임시로 description 사용
      speaking_style: data.description.includes('캐주얼') ? 'casual' : 'formal',
      interests: ['일반적인 관심사'], // 기본값
      background: data.description,
      typo_chance: data.typo_chance,
      meme_chance: data.meme_chance,
      avg_response_time_ms: data.avg_response_time_ms,
      avg_response_length: data.avg_response_length,
      emoji_usage: data.meme_chance, // 임시로 meme_chance 사용
      formality_level: data.description.includes('캐주얼') ? 'casual' : 'formal'
    }
  } catch (error) {
    console.error('AI 페르소나 조회 오류:', error)
    return null
  }
}

/**
 * 프롬프트 생성
 */
function generatePrompt(request: GenerateAIResponseRequest, persona: AIPersona): string {
  const promptSettings = PERSONA_PROMPT_SETTINGS[request.personaId] || PERSONA_PROMPT_SETTINGS[1]
  
  // 대화 히스토리 포맷팅
  const historyText = request.conversationHistory
    .map(msg => {
      // msg가 객체인지 확인하고 안전하게 처리
      if (typeof msg === 'object' && msg !== null) {
        const playerLabel = 'playerLabel' in msg ? msg.playerLabel : 'Unknown'
        const content = 'content' in msg ? msg.content : ''
        return `${playerLabel}: ${content}`
      }
      return 'Unknown: Invalid message format'
    })
    .join('\n')

  // 시스템 프롬프트
  const systemPrompt = promptSettings.systemPrompt

  // 사용자 프롬프트
  const userPrompt = promptSettings.userPromptTemplate
    .replace('{topic}', request.currentTopic)
    .replace('{gameType}', request.gameType)
    .replace('{history}', historyText)

  return `${systemPrompt}

${userPrompt}

응답은 자연스럽고 ${persona.speaking_style}한 톤으로 해주세요. ${request.maxLength || 100}자 이내로 답변해주세요.`
}

/**
 * OpenAI API 호출
 */
async function callOpenAI(prompt: string, temperature: number): Promise<OpenAIResponse> {
  try {
    console.log('Calling OpenAI API with prompt length:', prompt.length)
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: '당신은 AI vs Human 게임에서 AI 플레이어 역할을 합니다. 자연스럽고 인간다운 응답을 생성해주세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: DEFAULT_MODEL_CONFIG.max_tokens,
      top_p: DEFAULT_MODEL_CONFIG.top_p,
      frequency_penalty: DEFAULT_MODEL_CONFIG.frequency_penalty,
      presence_penalty: DEFAULT_MODEL_CONFIG.presence_penalty
    })

    console.log('OpenAI API response received:', {
      model: response.model,
      usage: response.usage,
      choicesCount: response.choices?.length
    })

    return response
  } catch (error) {
    console.error('OpenAI API call failed:', error)
    throw error
  }
}

/**
 * 응답 후처리
 */
async function postProcessResponse(
  response: string,
  persona: AIPersona,
  request: GenerateAIResponseRequest
): Promise<AIResponsePostProcessing> {
  let processedResponse = response
  const modifications = {
    typos: [] as Array<{ position: number; original: string; changed: string }>,
    emojis: [] as Array<{ position: number; emoji: string }>,
    memes: [] as Array<{ position: number; meme: string }>
  }

  // 오타 추가
  if (Math.random() < persona.typo_chance) {
    const typoResult = addTypo(processedResponse)
    processedResponse = typoResult.text
    modifications.typos.push(...typoResult.typos)
  }

  // 이모지 추가
  if (Math.random() < persona.emoji_usage) {
    const emojiResult = addEmoji(processedResponse, persona.formality_level)
    processedResponse = emojiResult.text
    modifications.emojis.push(...emojiResult.emojis)
  }

  // 밈 추가
  if (Math.random() < persona.meme_chance) {
    const memeResult = addMeme(processedResponse)
    processedResponse = memeResult.text
    modifications.memes.push(...memeResult.memes)
  }

  // 품질 메트릭 계산
  const quality: AIResponseQuality = {
    relevance: calculateRelevance(processedResponse, request.currentTopic),
    naturalness: calculateNaturalness(processedResponse),
    personality_consistency: calculatePersonalityConsistency(processedResponse, persona),
    response_time: 0, // 실제 응답 시간은 상위 함수에서 설정
    length_appropriateness: calculateLengthAppropriateness(processedResponse, request.maxLength || 100)
  }

  return {
    originalResponse: response,
    processedResponse,
    modifications,
    quality
  }
}

/**
 * 오타 추가
 */
function addTypo(text: string): { text: string; typos: Array<{ position: number; original: string; changed: string }> } {
  const typos: Array<{ position: number; original: string; changed: string }> = []
  const commonTypos: Record<string, string> = {
    'ㅏ': 'ㅑ', 'ㅓ': 'ㅕ', 'ㅗ': 'ㅛ', 'ㅜ': 'ㅠ',
    '가': '까', '나': '다', '라': '마', '바': '사',
    'the': 'teh', 'and': 'adn', 'you': 'yuo', 'are': 'aer'
  }

  let result = text
  const words = result.split(' ')
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (const [original, typo] of Object.entries(commonTypos)) {
      if (word.includes(original) && Math.random() < 0.1) {
        const newWord = word.replace(original, typo)
        words[i] = newWord
        typos.push({
          position: result.indexOf(word),
          original: word,
          changed: newWord
        })
        break
      }
    }
  }

  return { text: words.join(' '), typos }
}

/**
 * 이모지 추가
 */
function addEmoji(text: string, formalityLevel: string): { text: string; emojis: Array<{ position: number; emoji: string }> } {
  const emojis: Array<{ position: number; emoji: string }> = []
  const casualEmojis = ['😊', '👍', '😂', '🤔', '😅', '👋', '🎉', '💪']
  const formalEmojis = ['🙂', '👍', '🤝', '💼', '📝', '✅', '📊', '🎯']
  
  const emojiList = formalityLevel === 'casual' ? casualEmojis : formalEmojis
  
  // 문장 끝에 이모지 추가
  if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)]
    text += ` ${emoji}`
    emojis.push({
      position: text.length - emoji.length - 1,
      emoji
    })
  }

  return { text, emojis }
}

/**
 * 밈 추가
 */
function addMeme(text: string): { text: string; memes: Array<{ position: number; meme: string }> } {
  const memes: Array<{ position: number; meme: string }> = []
  const memePhrases = ['ㅋㅋㅋ', 'ㅎㅎ', '헐', '대박', '와우', '굿', '오케이', '좋아요']
  
  if (Math.random() < 0.3) {
    const meme = memePhrases[Math.floor(Math.random() * memePhrases.length)]
    text += ` ${meme}`
    memes.push({
      position: text.length - meme.length - 1,
      meme
    })
  }

  return { text, memes }
}

/**
 * 캐시 키 생성
 */
function generateCacheKey(request: GenerateAIResponseRequest): string {
  const key = `${request.gameId}-${request.playerLabel}-${request.personaId}-${request.currentTopic}-${request.conversationHistory.length}`
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * 품질 메트릭 계산 함수들
 */
function calculateRelevance(response: string, topic: string): number {
  const topicWords = topic.split(' ')
  const responseWords = response.split(' ')
  const commonWords = topicWords.filter(word => responseWords.includes(word))
  return Math.min(1, commonWords.length / Math.max(1, topicWords.length))
}

function calculateNaturalness(response: string): number {
  // 간단한 자연스러움 계산 (실제로는 더 복잡한 로직 필요)
  const hasProperEnding = /[.!?]$/.test(response)
  const hasReasonableLength = response.length >= 10 && response.length <= 200
  const hasNoExcessiveRepetition = !/(.)\1{3,}/.test(response)
  
  return (hasProperEnding ? 0.4 : 0) + (hasReasonableLength ? 0.4 : 0) + (hasNoExcessiveRepetition ? 0.2 : 0)
}

function calculatePersonalityConsistency(response: string, persona: AIPersona): number {
  const isCasual = persona.formality_level === 'casual'
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(response)
  const hasTypo = /[ㅑㅕㅛㅠ]/.test(response) || /\b(teh|adn|yuo|aer)\b/.test(response.toLowerCase())
  
  if (isCasual) {
    return (hasEmoji ? 0.5 : 0) + (hasTypo ? 0.3 : 0) + 0.2
  } else {
    return (!hasEmoji ? 0.6 : 0) + (!hasTypo ? 0.4 : 0)
  }
}

function calculateLengthAppropriateness(response: string, maxLength: number): number {
  const ratio = response.length / maxLength
  if (ratio <= 0.5) return 0.3
  if (ratio <= 0.8) return 1.0
  if (ratio <= 1.0) return 0.7
  return 0.2
}

/**
 * AI 통계 조회
 */
export function getAIStats() {
  return { ...aiStats }
}

/**
 * AI 통계 리셋
 */
export function resetAIStats() {
  aiStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    averageTokenUsage: 0,
    personaUsage: {},
    errorRates: {},
    qualityMetrics: {
      averageRelevance: 0,
      averageNaturalness: 0,
      averagePersonalityConsistency: 0
    }
  }
}

/**
 * 캐시 정리
 */
export function clearCache() {
  responseCache.clear()
}

/**
 * 캐시 통계
 */
export function getCacheStats() {
  return {
    size: responseCache.size,
    entries: Array.from(responseCache.values()).map(entry => ({
      key: entry.key,
      usage_count: entry.usage_count,
      expiresAt: entry.expiresAt
    }))
  }
}
