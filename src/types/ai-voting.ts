import { PlayerLabel, GameType } from './game'

export type AIVotingStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

export type AIVotingStrategy = 
  | 'behavioral_analysis'
  | 'conversation_patterns'
  | 'response_timing'
  | 'message_patterns'
  | 'comprehensive'

export interface AIVotingRequest {
  gameId: string
  playerLabel: string
  votingType: 'binary' | 'multi_select'
  maxSelections: number
  forceVoting?: boolean
  strategy?: AIVotingStrategy
  metadata?: Record<string, any>
}

export interface AIVotingResponse {
  success: boolean
  gameId: string
  playerLabel: string
  status: AIVotingStatus
  votingDecision?: {
    selectedPlayers: string[]
    confidence: number
    reasoning: string
    strategy: AIVotingStrategy
  }
  message?: string
  error?: string
  timestamp: string
  processingTime?: number
}

export interface AIVotingAnalysis {
  behavioralScore: number
  conversationScore: number
  timingScore: number
  patternScore: number
  overallScore: number
  confidence: number
  reasoning: string
}

export interface AIVotingStrategy {
  name: AIVotingStrategy
  weight: number
  description: string
  enabled: boolean
}

export interface AIVotingContext {
  gameId: string
  gameType: '1v1' | '1vn'
  totalPlayers: number
  aiPlayers: string[]
  humanPlayers: string[]
  conversationHistory: Array<{
    playerLabel: string
    content: string
    timestamp: string
    isAI: boolean
  }>
  votingHistory: Array<{
    playerLabel: string
    votedFor: string[]
    timestamp: string
  }>
  gameDuration: number
  currentPhase: 'active' | 'voting' | 'finished'
}

export interface AIVotingConfig {
  enabled: boolean
  defaultStrategy: AIVotingStrategy
  confidenceThreshold: number
  maxProcessingTime: number
  retryAttempts: number
  strategies: AIVotingStrategy[]
  qualityMetrics: {
    minConfidence: number
    maxResponseTime: number
    requiredAnalysisDepth: number
  }
}

export interface AIVotingStats {
  totalVotes: number
  successfulVotes: number
  failedVotes: number
  averageConfidence: number
  averageProcessingTime: number
  successRate: number
  strategyPerformance: Record<AIVotingStrategy, {
    usage: number
    successRate: number
    averageConfidence: number
  }>
  lastVoteTime?: string
}

export interface AIVotingEvent {
  type: 'voting_started' | 'voting_completed' | 'voting_failed'
  gameId: string
  playerLabel: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface AIVotingLog {
  id: string
  gameId: string
  playerLabel: string
  status: AIVotingStatus
  request: AIVotingRequest
  response?: AIVotingResponse
  error?: string
  startedAt: string
  completedAt?: string
  processingTime?: number
  strategy: AIVotingStrategy
  confidence?: number
}

export interface AIVotingResult {
  gameId: string
  playerLabel: string
  selectedPlayers: string[]
  confidence: number
  reasoning: string
  strategy: AIVotingStrategy
  processingTime: number
  timestamp: string
}

export interface AIVotingQuality {
  confidence: number
  reasoningQuality: number
  strategyEffectiveness: number
  processingEfficiency: number
  overallScore: number
  recommendations: string[]
}
