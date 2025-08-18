import { GameType, GameStatus, PlayerLabel } from './game'

// 메시지 전송 요청
export interface SendMessageRequest {
  gameId: string
  playerLabel: PlayerLabel
  content: string
}

// 메시지 전송 응답
export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

// 투표 제출 요청
export interface SubmitVoteRequest {
  gameId: string
  playerLabel: PlayerLabel
  votedForPlayer: PlayerLabel
}

// 투표 제출 응답
export interface SubmitVoteResponse {
  success: boolean
  voteId?: string
  error?: string
}

// 게임 상태 변경 요청
export interface UpdateGameStatusRequest {
  gameId: string
  status: GameStatus
  timeRemaining?: number
  turnTimeRemaining?: number
  currentTurn?: PlayerLabel
}

// 게임 상태 변경 응답
export interface UpdateGameStatusResponse {
  success: boolean
  error?: string
}

// 플레이어 상태 변경 요청
export interface UpdatePlayerStatusRequest {
  gameId: string
  playerLabel: PlayerLabel
  status: 'active' | 'left' | 'disconnected'
}

// 플레이어 상태 변경 응답
export interface UpdatePlayerStatusResponse {
  success: boolean
  error?: string
}

// 턴 변경 요청
export interface ChangeTurnRequest {
  gameId: string
  nextPlayerLabel: PlayerLabel
  turnTimeRemaining?: number
}

// 턴 변경 응답
export interface ChangeTurnResponse {
  success: boolean
  error?: string
}

// 투표 의도 신호 요청
export interface SignalVoteIntentionRequest {
  gameId: string
  playerLabel: PlayerLabel
  intention: 'ready' | 'not_ready'
}

// 투표 의도 신호 응답
export interface SignalVoteIntentionResponse {
  success: boolean
  error?: string
}

// 게임 시작 요청
export interface StartGameRequest {
  gameId: string
  firstTurn?: PlayerLabel
}

// 게임 시작 응답
export interface StartGameResponse {
  success: boolean
  error?: string
}

// 게임 종료 요청
export interface EndGameRequest {
  gameId: string
  reason: 'timeout' | 'all_voted' | 'manual'
}

// 게임 종료 응답
export interface EndGameResponse {
  success: boolean
  error?: string
}

// 게임 정보 조회 응답
export interface GetGameInfoResponse {
  success: boolean
  game?: {
    id: string
    type: GameType
    status: GameStatus
    topicId: number
    timeRemaining: number
    turnTimeRemaining: number
    currentTurn: PlayerLabel | null
    createdAt: string
  }
  players?: Array<{
    label: PlayerLabel
    isAI: boolean
    status: 'active' | 'left'
    aiPersonaId?: number
  }>
  error?: string
}

// 게임 메시지 조회 응답
export interface GetGameMessagesResponse {
  success: boolean
  messages?: Array<{
    id: string
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>
  error?: string
}

// 게임 투표 조회 응답
export interface GetGameVotesResponse {
  success: boolean
  votes?: Array<{
    id: string
    playerLabel: PlayerLabel
    votedForPlayer: PlayerLabel
    timestamp: string
  }>
  error?: string
}

// 게임 통계 조회 응답
export interface GetGameStatsResponse {
  success: boolean
  stats?: {
    totalMessages: number
    totalVotes: number
    averageResponseTime: number
    gameDuration: number
  }
  error?: string
}
