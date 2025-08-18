import { GameType, PlayerLabel } from './game'

// 매치메이킹 상태
export type MatchmakingStatus = 'waiting' | 'matched' | 'cancelled' | 'timeout'

// 대기열 타입
export type QueueType = '1v1' | '1vn'

// 플레이어 정보 (매치메이킹용)
export interface MatchmakingPlayer {
  id: string
  playerLabel: PlayerLabel
  joinedAt: string
  isAI: boolean
  aiPersonaId?: number
}

// 대기열 정보
export interface QueueEntry {
  id: string
  playerId: string
  playerLabel: PlayerLabel
  queueType: QueueType
  joinedAt: string
  status: MatchmakingStatus
  gameId?: string
}

// 매칭 결과
export interface MatchResult {
  gameId: string
  gameType: GameType
  players: MatchmakingPlayer[]
  matchedAt: string
  topicId: number
}

// 매치메이킹 요청
export interface JoinQueueRequest {
  queueType: QueueType
  playerLabel: PlayerLabel
  isAI?: boolean
  aiPersonaId?: number
}

// 매치메이킹 응답
export interface JoinQueueResponse {
  success: boolean
  queueEntryId?: string
  gameId?: string
  matchResult?: MatchResult
  error?: string
  estimatedWaitTime?: number
}

// 매칭 조건
export interface MatchingCriteria {
  queueType: QueueType
  minPlayers: number
  maxPlayers: number
  maxWaitTime: number // 초 단위
  aiPlayerRatio: number // AI 플레이어 비율 (0-1)
}

// 대기열 통계
export interface QueueStats {
  queueType: QueueType
  waitingPlayers: number
  averageWaitTime: number
  estimatedWaitTime: number
}
