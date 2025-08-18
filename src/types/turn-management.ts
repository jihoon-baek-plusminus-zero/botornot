import { PlayerLabel, GameStatus } from './game'

// 턴 상태
export type TurnStatus = 'waiting' | 'active' | 'timeout' | 'skipped'

// 턴 변경 이벤트
export interface TurnChangeEvent {
  gameId: string
  currentTurn: PlayerLabel
  previousTurn: PlayerLabel | null
  turnTimeRemaining: number
  turnStatus: TurnStatus
  timestamp: string
}

// 턴 타이머 설정
export interface TurnTimerConfig {
  defaultTurnTime: number // 기본 턴 시간 (초)
  warningTime: number // 경고 시간 (초)
  autoSkipTime: number // 자동 스킵 시간 (초)
  gracePeriod: number // 여유 시간 (초)
}

// 턴 관리 상태
export interface TurnManagementState {
  gameId: string
  currentTurn: PlayerLabel | null
  turnTimeRemaining: number
  turnStatus: TurnStatus
  turnStartTime: string | null
  lastActivityTime: string | null
  skippedTurns: PlayerLabel[]
  totalTurns: number
}

// 턴 변경 요청
export interface TurnChangeRequest {
  gameId: string
  nextPlayerLabel: PlayerLabel
  reason: 'manual' | 'timeout' | 'message_sent' | 'auto_skip'
  turnTimeRemaining?: number
}

// 턴 변경 응답
export interface TurnChangeResponse {
  success: boolean
  newTurn?: PlayerLabel
  turnTimeRemaining?: number
  error?: string
}

// 턴 타이머 업데이트
export interface TurnTimerUpdate {
  gameId: string
  timeRemaining: number
  isWarning: boolean
  timestamp: string
}

// 플레이어 턴 정보
export interface PlayerTurnInfo {
  playerLabel: PlayerLabel
  turnStartTime: string
  turnEndTime?: string
  duration: number
  status: TurnStatus
  messageCount: number
  wasSkipped: boolean
}

// 턴 히스토리
export interface TurnHistory {
  gameId: string
  turns: PlayerTurnInfo[]
  currentTurnIndex: number
  totalTurns: number
}
