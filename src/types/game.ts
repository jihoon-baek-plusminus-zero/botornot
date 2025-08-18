export type GameType = '1v1' | '1vn'

export type GameStatus = 'waiting' | 'active' | 'voting' | 'finished'

export type PlayerStatus = 'active' | 'left'

export type PlayerLabel = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Player {
  id: string
  game_id: string
  player_label: PlayerLabel
  player_color: string
  is_ai: boolean
  persona_id?: number
  status: PlayerStatus
  created_at: string
}

export interface Game {
  id: string
  game_type: GameType
  status: GameStatus
  topic_id: number
  created_at: string
}

export interface Message {
  id: number
  game_id: string
  player_id: string
  content: string
  created_at: string
}

export interface Vote {
  id: number
  game_id: string
  voter_player_id: string
  voted_for_player_id: string
}

export interface Topic {
  id: number
  content: string
}

export interface AIPersona {
  id: number
  name: string
  description: string
  typo_chance: number
  meme_chance: number
  avg_response_time_ms: number
  avg_response_length: number
}

export interface GameState {
  game: Game
  players: Player[]
  messages: Message[]
  currentTurn: PlayerLabel
  timeRemaining: number
  topic: Topic
  votes: Vote[]
}
