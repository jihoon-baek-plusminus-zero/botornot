export type TimeoutType = 'game_timeout' | 'turn_timeout' | 'vote_timeout'

export type TimeoutReason = 
  | 'game_duration_exceeded'
  | 'turn_duration_exceeded'
  | 'vote_duration_exceeded'
  | 'manual_timeout'
  | 'system_timeout'
  | 'unknown'

export interface TimeoutEvent {
  type: TimeoutType
  gameId: string
  playerLabel?: string
  reason: TimeoutReason
  timestamp: string
  metadata?: {
    gameType?: '1v1' | '1vn'
    duration?: number
    [key: string]: any
  }
}

export interface GameTimeoutConfig {
  gameTimeout: {
    '1v1': number // milliseconds
    '1vn': number // milliseconds
  }
  turnTimeout: number // milliseconds
  voteTimeout: number // milliseconds
  autoSkipEnabled: boolean
  autoVoteEnabled: boolean
  aiActionDelay: number // milliseconds
}

export interface TurnTimeoutRequest {
  gameId: string
  playerLabel: string
  duration?: number
}

export interface GameTimeoutResponse {
  success: boolean
  gameId: string
  timeoutStarted: boolean
  duration: number
  message?: string
  error?: string
}

export interface VoteTimeoutResponse {
  success: boolean
  gameId: string
  timeoutStarted: boolean
  duration: number
  message?: string
  error?: string
}

export interface TimeoutHandlerRequest {
  gameId: string
  type: TimeoutType
  playerLabel?: string
  reason?: TimeoutReason
  metadata?: Record<string, any>
}

export interface TimeoutStats {
  totalTimeouts: number
  gameTimeouts: number
  turnTimeouts: number
  voteTimeouts: number
  aiAutoActions: number
  lastTimeout?: string
}

export interface TimeoutNotification {
  type: TimeoutType
  gameId: string
  playerLabel?: string
  message: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface TimeoutMonitor {
  gameId: string
  type: TimeoutType
  startTime: number
  duration: number
  isActive: boolean
  onTimeout?: (event: TimeoutEvent) => void
}
