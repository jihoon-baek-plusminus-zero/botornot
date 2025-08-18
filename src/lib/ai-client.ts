import {
  GenerateAIResponseRequest,
  GenerateAIResponseResponse,
  AIPersona
} from '@/types/openai'
import { PlayerLabel } from '@/types/game'

const API_BASE_URL = '/api/ai'

/**
 * AI 응답 생성
 */
export async function generateAIResponse(request: GenerateAIResponseRequest): Promise<GenerateAIResponseResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 응답 생성에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Generate AI response error:', error)
    throw error
  }
}

/**
 * AI 페르소나 목록 조회
 */
export async function getAIPersonas(): Promise<{ success: boolean; personas?: AIPersona[]; count?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/personas`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 페르소나 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI personas error:', error)
    throw error
  }
}

/**
 * 특정 AI 페르소나 조회
 */
export async function getAIPersona(personaId: number): Promise<{ success: boolean; persona?: AIPersona; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/personas?id=${personaId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 페르소나 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI persona error:', error)
    throw error
  }
}

/**
 * AI 통계 조회
 */
export async function getAIStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-response?action=stats`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 통계 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI stats error:', error)
    throw error
  }
}

/**
 * AI 캐시 통계 조회
 */
export async function getAICacheStats(): Promise<{ success: boolean; cache?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-response?action=cache`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 캐시 통계 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI cache stats error:', error)
    throw error
  }
}

/**
 * 간단한 AI 응답 생성 (기본 설정 사용)
 */
export async function generateSimpleAIResponse(
  gameId: string,
  playerLabel: PlayerLabel,
  personaId: number,
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>,
  currentTopic: string,
  gameType: '1v1' | '1vn'
): Promise<GenerateAIResponseResponse> {
  return generateAIResponse({
    gameId,
    playerLabel,
    personaId,
    conversationHistory,
    currentTopic,
    gameType,
    turnTimeRemaining: 10,
    maxLength: 100,
    temperature: 0.7
  })
}

/**
 * AI 응답 생성 (고급 설정)
 */
export async function generateAdvancedAIResponse(
  gameId: string,
  playerLabel: PlayerLabel,
  personaId: number,
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>,
  currentTopic: string,
  gameType: '1v1' | '1vn',
  options: {
    maxLength?: number
    temperature?: number
    turnTimeRemaining?: number
  } = {}
): Promise<GenerateAIResponseResponse> {
  return generateAIResponse({
    gameId,
    playerLabel,
    personaId,
    conversationHistory,
    currentTopic,
    gameType,
    turnTimeRemaining: options.turnTimeRemaining || 10,
    maxLength: options.maxLength || 100,
    temperature: options.temperature || 0.7
  })
}

/**
 * AI 응답 품질 평가
 */
export function evaluateAIResponseQuality(
  response: string,
  topic: string,
  persona: AIPersona
): {
  relevance: number
  naturalness: number
  personalityConsistency: number
  lengthAppropriateness: number
  overall: number
} {
  // 관련성 계산
  const topicWords = topic.split(' ')
  const responseWords = response.split(' ')
  const commonWords = topicWords.filter(word => responseWords.includes(word))
  const relevance = Math.min(1, commonWords.length / Math.max(1, topicWords.length))

  // 자연스러움 계산
  const hasProperEnding = /[.!?]$/.test(response)
  const hasReasonableLength = response.length >= 10 && response.length <= 200
  const hasNoExcessiveRepetition = !/(.)\1{3,}/.test(response)
  const naturalness = (hasProperEnding ? 0.4 : 0) + (hasReasonableLength ? 0.4 : 0) + (hasNoExcessiveRepetition ? 0.2 : 0)

  // 페르소나 일관성 계산
  const isCasual = persona.formality_level === 'casual'
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(response)
  const hasTypo = /[ㅑㅕㅛㅠ]/.test(response) || /\b(teh|adn|yuo|aer)\b/.test(response.toLowerCase())
  
  let personalityConsistency = 0
  if (isCasual) {
    personalityConsistency = (hasEmoji ? 0.5 : 0) + (hasTypo ? 0.3 : 0) + 0.2
  } else {
    personalityConsistency = (!hasEmoji ? 0.6 : 0) + (!hasTypo ? 0.4 : 0)
  }

  // 길이 적절성 계산
  const maxLength = persona.avg_response_length * 1.5
  const ratio = response.length / maxLength
  let lengthAppropriateness = 0
  if (ratio <= 0.5) lengthAppropriateness = 0.3
  else if (ratio <= 0.8) lengthAppropriateness = 1.0
  else if (ratio <= 1.0) lengthAppropriateness = 0.7
  else lengthAppropriateness = 0.2

  // 전체 점수 계산
  const overall = (relevance * 0.3 + naturalness * 0.3 + personalityConsistency * 0.2 + lengthAppropriateness * 0.2)

  return {
    relevance,
    naturalness,
    personalityConsistency,
    lengthAppropriateness,
    overall
  }
}

/**
 * AI 응답 시뮬레이션 (테스트용)
 */
export async function simulateAIResponse(
  gameId: string,
  playerLabel: PlayerLabel,
  personaId: number,
  delay: number = 2000
): Promise<GenerateAIResponseResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const responses = [
        '안녕하세요! 오늘 날씨가 정말 좋네요 😊',
        '그렇네요, 정말 좋은 날씨입니다 👍',
        '맞아요! 이런 날에는 밖에 나가서 산책하기 좋을 것 같아요',
        '저도 그렇게 생각해요! 특히 공원에서 책 읽기 좋을 것 같네요 📚',
        '정말 좋은 아이디어네요! 저도 한번 해보고 싶어요 😄'
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      resolve({
        success: true,
        response: randomResponse,
        processedResponse: randomResponse,
        metadata: {
          originalLength: randomResponse.length,
          processedLength: randomResponse.length,
          hasTypo: false,
          hasEmoji: true,
          hasMeme: false,
          responseTime: delay,
          tokenUsage: { prompt: 50, completion: 20, total: 70 }
        }
      })
    }, delay)
  })
}

/**
 * AI 응답 배치 생성
 */
export async function generateBatchAIResponses(
  requests: GenerateAIResponseRequest[]
): Promise<GenerateAIResponseResponse[]> {
  const promises = requests.map(request => generateAIResponse(request))
  return Promise.all(promises)
}

/**
 * AI 응답 생성 (재시도 로직 포함)
 */
export async function generateAIResponseWithRetry(
  request: GenerateAIResponseRequest,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<GenerateAIResponseResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateAIResponse(request)
      
      if (result.success) {
        return result
      } else {
        lastError = new Error(result.error || 'AI 응답 생성 실패')
      }
    } catch (error) {
      lastError = error as Error
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError || new Error('AI 응답 생성에 실패했습니다.')
}
