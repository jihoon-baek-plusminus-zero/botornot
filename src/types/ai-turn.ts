import { PlayerLabel, GameType } from './game'
import { AIPersona } from './openai'

// AI 턴 상태
export type AITurnStatus = 'waiting' | 'analyzing' | 'voting' | 'messaging' | 'completed' | 'error'

// AI 턴 처리 요청
export interface AITurnRequest {
  gameId: string
  playerLabel: PlayerLabel
  personaId: number
  gameType: GameType
  currentTopic: string
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  turnTimeRemaining: number
  gameStatus: 'active' | 'voting' | 'finished'
  voteCount: number
  totalPlayers: number
  timeRemaining: number
  currentTurn: PlayerLabel
  players: Array<{
    label: PlayerLabel
    name: string
    isAI: boolean
    isActive: boolean
    hasVoted: boolean
  }>
}

// AI 투표 결정 요청
export interface AIVoteDecisionRequest {
  gameId: string
  playerLabel: PlayerLabel
  personaId: number
  gameType: GameType
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  currentTopic: string
  timeRemaining: number
  voteCount: number
  totalPlayers: number
  players: Array<{
    label: PlayerLabel
    name: string
    isAI: boolean
    isActive: boolean
    hasVoted: boolean
  }>
}

// AI 투표 결정 응답
export interface AIVoteDecisionResponse {
  success: boolean
  shouldVote: boolean
  reason?: string
  confidence: number // 0-1 사이 값
  analysis?: {
    gameProgress: number // 0-1 사이 값
    conversationQuality: number // 0-1 사이 값
    timePressure: number // 0-1 사이 값
    playerBehavior: string
  }
  error?: string
}

// AI 메시지 생성 요청
export interface AIMessageGenerationRequest {
  gameId: string
  playerLabel: PlayerLabel
  personaId: number
  gameType: GameType
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  currentTopic: string
  turnTimeRemaining: number
  timeRemaining: number
  shouldVote: boolean // 투표 결정 결과
  voteReason?: string // 투표 이유
}

// AI 메시지 생성 응답
export interface AIMessageGenerationResponse {
  success: boolean
  message?: string
  shouldSkip?: boolean
  reason?: string
  metadata?: {
    responseTime: number
    tokenUsage: number
    quality: number
  }
  error?: string
}

// AI 턴 처리 응답
export interface AITurnResponse {
  success: boolean
  turnStatus: AITurnStatus
  voteDecision?: AIVoteDecisionResponse
  messageGeneration?: AIMessageGenerationResponse
  actions: Array<{
    type: 'vote' | 'message' | 'skip'
    data?: any
    timestamp: string
  }>
  metadata: {
    totalProcessingTime: number
    personaId: number
    playerLabel: PlayerLabel
    gameId: string
  }
  error?: string
}

// AI 턴 처리 컨텍스트
export interface AITurnContext {
  gameId: string
  playerLabel: PlayerLabel
  persona: AIPersona
  gameType: GameType
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  currentTopic: string
  turnTimeRemaining: number
  timeRemaining: number
  voteCount: number
  totalPlayers: number
  players: Array<{
    label: PlayerLabel
    name: string
    isAI: boolean
    isActive: boolean
    hasVoted: boolean
  }>
  gameStatus: 'active' | 'voting' | 'finished'
}

// AI 턴 처리 설정
export interface AITurnConfig {
  minConversationLength: number // 최소 대화 길이
  maxWaitTime: number // 최대 대기 시간
  voteThreshold: number // 투표 임계값
  skipThreshold: number // 스킵 임계값
  responseTimeLimit: number // 응답 시간 제한
  qualityThreshold: number // 품질 임계값
}

// AI 턴 처리 통계
export interface AITurnStats {
  totalTurns: number
  successfulTurns: number
  failedTurns: number
  averageProcessingTime: number
  voteDecisions: {
    total: number
    voted: number
    skipped: number
  }
  messageGenerations: {
    total: number
    generated: number
    skipped: number
  }
  personaUsage: Record<number, number>
  errorRates: Record<string, number>
  qualityMetrics: {
    averageVoteConfidence: number
    averageMessageQuality: number
    averageResponseTime: number
  }
}

// AI 턴 처리 이벤트
export interface AITurnEvent {
  type: 'turn_started' | 'vote_decision' | 'message_generated' | 'turn_completed' | 'turn_error'
  gameId: string
  playerLabel: PlayerLabel
  timestamp: string
  data?: any
  error?: string
}

// AI 턴 처리 로그
export interface AITurnLog {
  id: string
  gameId: string
  playerLabel: PlayerLabel
  personaId: number
  turnStatus: AITurnStatus
  processingTime: number
  voteDecision?: AIVoteDecisionResponse
  messageGeneration?: AIMessageGenerationResponse
  error?: string
  timestamp: string
  metadata?: Record<string, any>
}
