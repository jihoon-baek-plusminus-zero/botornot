import { PlayerLabel } from './game'

// OpenAI API 응답 타입
export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// AI 페르소나 설정
export interface AIPersona {
  id: number
  name: string
  description: string
  personality: string
  speaking_style: string
  interests: string[]
  background: string
  typo_chance: number // 0-1 사이 값
  meme_chance: number // 0-1 사이 값
  avg_response_time_ms: number
  avg_response_length: number
  emoji_usage: number // 0-1 사이 값
  formality_level: 'casual' | 'formal' | 'mixed'
}

// AI 응답 생성 요청
export interface GenerateAIResponseRequest {
  gameId: string
  playerLabel: PlayerLabel
  personaId: number
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  currentTopic: string
  gameType: '1v1' | '1vn'
  turnTimeRemaining: number
  maxLength?: number
  temperature?: number
}

// AI 응답 생성 응답
export interface GenerateAIResponseResponse {
  success: boolean
  response?: string
  processedResponse?: string // 오타, 이모지 등이 적용된 최종 응답
  error?: string
  metadata?: {
    originalLength: number
    processedLength: number
    hasTypo: boolean
    hasEmoji: boolean
    hasMeme: boolean
    responseTime: number
    tokenUsage: {
      prompt: number
      completion: number
      total: number
    }
  }
}

// AI 응답 처리 옵션
export interface AIResponseProcessingOptions {
  addTypo: boolean
  addEmoji: boolean
  addMeme: boolean
  adjustLength: boolean
  maintainPersonality: boolean
}

// AI 페르소나 프롬프트 템플릿
export interface AIPromptTemplate {
  system: string
  user: string
  assistant: string
}

// AI 응답 품질 메트릭
export interface AIResponseQuality {
  relevance: number // 0-1
  naturalness: number // 0-1
  personality_consistency: number // 0-1
  response_time: number // ms
  length_appropriateness: number // 0-1
}

// AI 응답 캐시
export interface AIResponseCache {
  key: string
  response: string
  timestamp: string
  expiresAt: string
  usage_count: number
}

// AI 모델 설정
export interface AIModelConfig {
  model: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  stop?: string[]
}

// AI 응답 생성 컨텍스트
export interface AIGenerationContext {
  gameId: string
  playerLabel: PlayerLabel
  persona: AIPersona
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    playerLabel?: PlayerLabel
  }>
  currentTopic: string
  gameType: '1v1' | '1vn'
  turnTimeRemaining: number
  previousResponses: string[]
  gameRules: string[]
}

// AI 응답 후처리 결과
export interface AIResponsePostProcessing {
  originalResponse: string
  processedResponse: string
  modifications: {
    typos: Array<{
      position: number
      original: string
      changed: string
    }>
    emojis: Array<{
      position: number
      emoji: string
    }>
    memes: Array<{
      position: number
      meme: string
    }>
  }
  quality: AIResponseQuality
}

// AI 페르소나별 프롬프트 설정
export interface PersonaPromptSettings {
  personaId: number
  systemPrompt: string
  userPromptTemplate: string
  responseConstraints: string[]
  personalityHints: string[]
  conversationStyle: string
}

// AI 응답 생성 통계
export interface AIResponseStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  averageTokenUsage: number
  personaUsage: Record<number, number>
  errorRates: Record<string, number>
  qualityMetrics: {
    averageRelevance: number
    averageNaturalness: number
    averagePersonalityConsistency: number
  }
}
