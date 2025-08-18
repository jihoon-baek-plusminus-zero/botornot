export type DisconnectReason = 
  | 'manual_disconnect' 
  | 'browser_close' 
  | 'page_hidden' 
  | 'network_error' 
  | 'timeout' 
  | 'server_error' 
  | 'unknown'

export type PlayerDisconnectStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error'

export interface PlayerDisconnectEvent {
  gameId: string
  playerLabel: string
  reason: DisconnectReason
  timestamp: string
  metadata?: {
    userAgent?: string
    lastSeen?: string
    reconnectAttempts?: number
  }
}

export interface PlayerReconnectEvent {
  gameId: string
  playerLabel: string
  timestamp: string
  reconnectAttempt: number
  success: boolean
  metadata?: {
    userAgent?: string
    reconnectTime?: number
  }
}

export interface DisconnectDetectionConfig {
  heartbeatInterval: number // milliseconds
  heartbeatTimeout: number // milliseconds
  reconnectAttempts: number
  reconnectDelay: number // milliseconds
  maxReconnectDelay: number // milliseconds
}

export interface PlayerConnectionState {
  gameId: string
  playerLabel: string
  status: PlayerDisconnectStatus
  lastSeen: string
  disconnectReason?: DisconnectReason
  reconnectAttempts: number
  isActive: boolean
}

export interface GameConnectionState {
  gameId: string
  totalPlayers: number
  connectedPlayers: number
  disconnectedPlayers: number
  players: PlayerConnectionState[]
  lastUpdate: string
}

export interface DisconnectHandlerRequest {
  gameId: string
  playerLabel: string
  action: 'heartbeat' | 'disconnect' | 'reconnect'
  reason?: DisconnectReason
  metadata?: Record<string, any>
}

export interface DisconnectHandlerResponse {
  success: boolean
  gameId: string
  playerLabel: string
  action: string
  message?: string
  error?: string
  data?: {
    connectionState?: PlayerConnectionState
    gameState?: GameConnectionState
  }
}

export interface ReconnectHandlerRequest {
  gameId: string
  playerLabel: string
  attempt: number
  metadata?: Record<string, any>
}

export interface ReconnectHandlerResponse {
  success: boolean
  gameId: string
  playerLabel: string
  reconnected: boolean
  message?: string
  error?: string
  data?: {
    connectionState?: PlayerConnectionState
    gameState?: GameConnectionState
  }
}

export interface HeartbeatRequest {
  gameId: string
  playerLabel: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface HeartbeatResponse {
  success: boolean
  gameId: string
  playerLabel: string
  received: boolean
  message?: string
  error?: string
  data?: {
    connectionState?: PlayerConnectionState
    gameState?: GameConnectionState
  }
}

export interface DisconnectStats {
  totalDisconnects: number
  successfulReconnects: number
  failedReconnects: number
  averageReconnectTime: number
  disconnectReasons: Record<DisconnectReason, number>
  lastDisconnect?: string
  lastReconnect?: string
}

export interface DisconnectNotification {
  type: 'disconnect' | 'reconnect' | 'reconnect_failed' | 'connection_warning'
  gameId: string
  playerLabel: string
  message: string
  timestamp: string
  reason?: DisconnectReason
  metadata?: Record<string, any>
}
