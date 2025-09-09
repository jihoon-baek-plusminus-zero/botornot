export type PlayerType = 'human' | 'ai'

export interface Player {
  id: number // player[0], player[1], etc.
  type: PlayerType
  profileName: string // Player A, B, C, D, E
  isActive: boolean // 현재 차례인지
}

export interface ChatMessage {
  id: string
  playerId: number
  profileName: string
  content: string
  timestamp: Date
  type: PlayerType
}

export interface ChatRoom {
  id: string
  totalPlayers: number
  players: Player[]
  messages: ChatMessage[]
  currentTurn: number // 현재 차례인 플레이어의 id
  isGameStarted: boolean
  turnOrder: string[] // Player A, B, C, D, E 순서
}

export interface ChatRoomState {
  room: ChatRoom
  currentUserPlayerId?: number // 현재 접속한 유저의 플레이어 ID
}
