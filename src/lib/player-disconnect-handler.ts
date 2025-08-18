import { 
  DisconnectReason, 
  PlayerConnectionState, 
  GameConnectionState,
  DisconnectHandlerRequest,
  DisconnectHandlerResponse,
  ReconnectHandlerRequest,
  ReconnectHandlerResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  DisconnectStats,
  DisconnectDetectionConfig
} from '@/types/player-disconnect'
import { createServerClient } from './supabase'
import { broadcastPlayerDisconnect, broadcastPlayerReconnect, broadcastDisconnectNotification } from './realtime'
import { generateId } from './utils'

// 기본 설정
const DEFAULT_CONFIG: DisconnectDetectionConfig = {
  heartbeatInterval: 30000, // 30초
  heartbeatTimeout: 90000,  // 90초
  reconnectAttempts: 5,
  reconnectDelay: 1000,     // 1초
  maxReconnectDelay: 30000  // 30초
}

// 메모리 기반 저장소 (프로덕션에서는 Redis 사용 권장)
const gameConnectionStates: Map<string, GameConnectionState> = new Map()
const playerHeartbeats: Map<string, { lastSeen: number; timeout: NodeJS.Timeout }> = new Map()
const disconnectStats: DisconnectStats = {
  totalDisconnects: 0,
  successfulReconnects: 0,
  failedReconnects: 0,
  averageReconnectTime: 0,
  disconnectReasons: {
    manual_disconnect: 0,
    browser_close: 0,
    page_hidden: 0,
    network_error: 0,
    timeout: 0,
    server_error: 0,
    unknown: 0
  }
}

// 하트비트 모니터링 시작
export function startHeartbeatMonitoring(): void {
  console.log('[Player Disconnect Handler] Starting heartbeat monitoring...')
  
  // 주기적으로 하트비트 체크
  setInterval(() => {
    checkPlayerHeartbeats()
  }, DEFAULT_CONFIG.heartbeatInterval)
  
  console.log('[Player Disconnect Handler] Heartbeat monitoring started')
}

// 하트비트 모니터링 중지
export function stopHeartbeatMonitoring(): void {
  console.log('[Player Disconnect Handler] Stopping heartbeat monitoring...')
  
  // 모든 하트비트 타임아웃 정리
  for (const [playerKey, heartbeat] of playerHeartbeats.entries()) {
    clearTimeout(heartbeat.timeout)
  }
  playerHeartbeats.clear()
  
  console.log('[Player Disconnect Handler] Heartbeat monitoring stopped')
}

// 플레이어 하트비트 처리
export async function handlePlayerHeartbeat(request: HeartbeatRequest): Promise<HeartbeatResponse> {
  try {
    const { gameId, playerLabel, timestamp } = request
    
    console.log(`[Player Disconnect Handler] Heartbeat received from ${playerLabel} in game ${gameId}`)
    
    // 하트비트 업데이트
    updatePlayerHeartbeat(gameId, playerLabel)
    
    // 연결 상태 업데이트
    await updatePlayerConnectionState(gameId, playerLabel, 'connected')
    
    return {
      success: true,
      gameId,
      playerLabel,
      received: true,
      message: 'Heartbeat received successfully',
      data: {
        connectionState: await getPlayerConnectionState(gameId, playerLabel),
        gameState: await getGameConnectionState(gameId)
      }
    }
    
  } catch (error) {
    console.error('[Player Disconnect Handler] Error handling heartbeat:', error)
    
    return {
      success: false,
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      received: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 플레이어 연결 해제 처리
export async function handlePlayerDisconnect(request: DisconnectHandlerRequest): Promise<DisconnectHandlerResponse> {
  try {
    const { gameId, playerLabel, reason = 'manual_disconnect' } = request
    
    console.log(`[Player Disconnect Handler] Player ${playerLabel} disconnected from game ${gameId}, reason: ${reason}`)
    
    // 하트비트 정리
    cleanupPlayerHeartbeat(gameId, playerLabel)
    
    // 연결 상태 업데이트
    await updatePlayerConnectionState(gameId, playerLabel, 'disconnected', reason)
    
    // 통계 업데이트
    updateDisconnectStats(reason)
    
    // 시스템 메시지 추가
    await addDisconnectSystemMessage(gameId, playerLabel, reason)
    
    // Realtime 브로드캐스트
    await broadcastPlayerDisconnect(gameId, {
      gameId,
      playerLabel,
      reason,
      timestamp: new Date().toISOString()
    })
    
    // 알림 브로드캐스트
    await broadcastDisconnectNotification(gameId, {
      type: 'disconnect',
      gameId,
      playerLabel,
      message: `Player ${playerLabel} has left the game.`,
      timestamp: new Date().toISOString(),
      reason
    })
    
    return {
      success: true,
      gameId,
      playerLabel,
      action: 'disconnect',
      message: 'Player disconnected successfully',
      data: {
        connectionState: await getPlayerConnectionState(gameId, playerLabel),
        gameState: await getGameConnectionState(gameId)
      }
    }
    
  } catch (error) {
    console.error('[Player Disconnect Handler] Error handling disconnect:', error)
    
    return {
      success: false,
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      action: 'disconnect',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 플레이어 재연결 처리
export async function handlePlayerReconnect(request: ReconnectHandlerRequest): Promise<ReconnectHandlerResponse> {
  try {
    const { gameId, playerLabel, attempt } = request
    
    console.log(`[Player Disconnect Handler] Player ${playerLabel} attempting to reconnect to game ${gameId} (attempt ${attempt})`)
    
    // 게임 상태 확인
    const gameState = await getGameConnectionState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }
    
    // 플레이어가 게임에 존재하는지 확인
    const player = gameState.players.find(p => p.playerLabel === playerLabel)
    if (!player) {
      throw new Error('Player not found in game')
    }
    
    // 재연결 성공
    const reconnectTime = Date.now()
    
    // 하트비트 재시작
    updatePlayerHeartbeat(gameId, playerLabel)
    
    // 연결 상태 업데이트
    await updatePlayerConnectionState(gameId, playerLabel, 'connected')
    
    // 통계 업데이트
    updateReconnectStats(reconnectTime - new Date(player.lastSeen).getTime())
    
    // 시스템 메시지 추가
    await addReconnectSystemMessage(gameId, playerLabel)
    
    // Realtime 브로드캐스트
    await broadcastPlayerReconnect(gameId, {
      gameId,
      playerLabel,
      timestamp: new Date().toISOString(),
      reconnectAttempt: attempt,
      success: true
    })
    
    // 알림 브로드캐스트
    await broadcastDisconnectNotification(gameId, {
      type: 'reconnect',
      gameId,
      playerLabel,
      message: `Player ${playerLabel} has rejoined the game.`,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: true,
      gameId,
      playerLabel,
      reconnected: true,
      message: 'Player reconnected successfully',
      data: {
        connectionState: await getPlayerConnectionState(gameId, playerLabel),
        gameState: await getGameConnectionState(gameId)
      }
    }
    
  } catch (error) {
    console.error('[Player Disconnect Handler] Error handling reconnect:', error)
    
    return {
      success: false,
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      reconnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 플레이어 하트비트 체크
function checkPlayerHeartbeats(): void {
  const now = Date.now()
  const timeoutThreshold = now - DEFAULT_CONFIG.heartbeatTimeout
  
  for (const [playerKey, heartbeat] of playerHeartbeats.entries()) {
    if (heartbeat.lastSeen < timeoutThreshold) {
      // 타임아웃 발생
      const [gameId, playerLabel] = playerKey.split(':')
      
      console.log(`[Player Disconnect Handler] Heartbeat timeout for player ${playerLabel} in game ${gameId}`)
      
      // 자동 연결 해제 처리
      handlePlayerDisconnect({
        gameId,
        playerLabel,
        action: 'disconnect',
        reason: 'timeout'
      }).catch(error => {
        console.error(`[Player Disconnect Handler] Error handling timeout disconnect for ${playerLabel}:`, error)
      })
    }
  }
}

// 플레이어 하트비트 업데이트
function updatePlayerHeartbeat(gameId: string, playerLabel: string): void {
  const playerKey = `${gameId}:${playerLabel}`
  const now = Date.now()
  
  // 기존 타임아웃 정리
  if (playerHeartbeats.has(playerKey)) {
    clearTimeout(playerHeartbeats.get(playerKey)!.timeout)
  }
  
  // 새로운 하트비트 설정
  const timeout = setTimeout(() => {
    console.log(`[Player Disconnect Handler] Heartbeat timeout for player ${playerLabel} in game ${gameId}`)
    
    handlePlayerDisconnect({
      gameId,
      playerLabel,
      action: 'disconnect',
      reason: 'timeout'
    }).catch(error => {
      console.error(`[Player Disconnect Handler] Error handling timeout disconnect for ${playerLabel}:`, error)
    })
  }, DEFAULT_CONFIG.heartbeatTimeout)
  
  playerHeartbeats.set(playerKey, {
    lastSeen: now,
    timeout
  })
}

// 플레이어 하트비트 정리
function cleanupPlayerHeartbeat(gameId: string, playerLabel: string): void {
  const playerKey = `${gameId}:${playerLabel}`
  
  if (playerHeartbeats.has(playerKey)) {
    clearTimeout(playerHeartbeats.get(playerKey)!.timeout)
    playerHeartbeats.delete(playerKey)
  }
}

// 플레이어 연결 상태 업데이트
async function updatePlayerConnectionState(
  gameId: string, 
  playerLabel: string, 
  status: 'connected' | 'disconnected' | 'reconnecting',
  disconnectReason?: DisconnectReason
): Promise<void> {
  const now = new Date().toISOString()
  
  // 게임 연결 상태 가져오기
  let gameState = gameConnectionStates.get(gameId)
  if (!gameState) {
    gameState = {
      gameId,
      totalPlayers: 0,
      connectedPlayers: 0,
      disconnectedPlayers: 0,
      players: [],
      lastUpdate: now
    }
  }
  
  // 플레이어 상태 찾기 또는 생성
  let playerState = gameState.players.find(p => p.playerLabel === playerLabel)
  if (!playerState) {
    playerState = {
      gameId,
      playerLabel,
      status: 'connected',
      lastSeen: now,
      reconnectAttempts: 0,
      isActive: true
    }
    gameState.players.push(playerState)
    gameState.totalPlayers++
  }
  
  // 상태 업데이트
  const previousStatus = playerState.status
  playerState.status = status
  playerState.lastSeen = now
  
  if (disconnectReason) {
    playerState.disconnectReason = disconnectReason
  }
  
  if (status === 'connected') {
    playerState.reconnectAttempts = 0
    playerState.disconnectReason = undefined
  }
  
  // 연결된/해제된 플레이어 수 업데이트
  gameState.connectedPlayers = gameState.players.filter(p => p.status === 'connected').length
  gameState.disconnectedPlayers = gameState.players.filter(p => p.status === 'disconnected').length
  gameState.lastUpdate = now
  
  // 상태 저장
  gameConnectionStates.set(gameId, gameState)
  
  console.log(`[Player Disconnect Handler] Player ${playerLabel} status updated: ${previousStatus} -> ${status}`)
}

// 플레이어 연결 상태 조회
export async function getPlayerConnectionState(gameId: string, playerLabel: string): Promise<PlayerConnectionState | null> {
  const gameState = gameConnectionStates.get(gameId)
  if (!gameState) return null
  
  return gameState.players.find(p => p.playerLabel === playerLabel) || null
}

// 게임 연결 상태 조회
export async function getGameConnectionState(gameId: string): Promise<GameConnectionState | null> {
  return gameConnectionStates.get(gameId) || null
}

// 게임 상태 가져오기
export async function getGameState(gameId: string): Promise<any> {
  const supabase = createServerClient()
  
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (error) {
    console.error('[Player Disconnect Handler] Error fetching game state:', error)
    return null
  }
  
  return game
}

// 연결 해제 시스템 메시지 추가
async function addDisconnectSystemMessage(gameId: string, playerLabel: string, reason: DisconnectReason): Promise<void> {
  const supabase = createServerClient()
  
  let messageContent = ''
  switch (reason) {
    case 'browser_close':
      messageContent = `Player ${playerLabel} has left the game.`
      break
    case 'page_hidden':
      messageContent = `Player ${playerLabel} is temporarily away.`
      break
    case 'network_error':
      messageContent = `Player ${playerLabel} lost connection.`
      break
    case 'timeout':
      messageContent = `Player ${playerLabel} was disconnected due to inactivity.`
      break
    default:
      messageContent = `Player ${playerLabel} has left the game.`
  }
  
  await supabase
    .from('messages')
    .insert([{
      game_id: gameId,
      player_label: 'SYSTEM',
      content: messageContent,
      is_system_message: true,
      created_at: new Date().toISOString()
    }])
}

// 재연결 시스템 메시지 추가
async function addReconnectSystemMessage(gameId: string, playerLabel: string): Promise<void> {
  const supabase = createServerClient()
  
  await supabase
    .from('messages')
    .insert([{
      game_id: gameId,
      player_label: 'SYSTEM',
      content: `Player ${playerLabel} has rejoined the game.`,
      is_system_message: true,
      created_at: new Date().toISOString()
    }])
}

// 연결 해제 통계 업데이트
function updateDisconnectStats(reason: DisconnectReason): void {
  disconnectStats.totalDisconnects++
  disconnectStats.disconnectReasons[reason]++
  disconnectStats.lastDisconnect = new Date().toISOString()
}

// 재연결 통계 업데이트
function updateReconnectStats(reconnectTime: number): void {
  disconnectStats.successfulReconnects++
  
  // 평균 재연결 시간 업데이트
  disconnectStats.averageReconnectTime = 
    (disconnectStats.averageReconnectTime * (disconnectStats.successfulReconnects - 1) + reconnectTime) / 
    disconnectStats.successfulReconnects
  
  disconnectStats.lastReconnect = new Date().toISOString()
}

// 연결 해제 통계 조회
export function getDisconnectStats(): DisconnectStats {
  return { ...disconnectStats }
}

// 연결 해제 통계 초기화
export function resetDisconnectStats(): void {
  Object.assign(disconnectStats, {
    totalDisconnects: 0,
    successfulReconnects: 0,
    failedReconnects: 0,
    averageReconnectTime: 0,
    disconnectReasons: {
      manual_disconnect: 0,
      browser_close: 0,
      page_hidden: 0,
      network_error: 0,
      timeout: 0,
      server_error: 0,
      unknown: 0
    }
  })
}

// 연결 해제 설정 업데이트
export function updateDisconnectConfig(config: Partial<DisconnectDetectionConfig>): void {
  Object.assign(DEFAULT_CONFIG, config)
}

// 게임 정리
export function cleanupGame(gameId: string): void {
  // 게임 연결 상태 제거
  gameConnectionStates.delete(gameId)
  
  // 게임의 모든 플레이어 하트비트 정리
  for (const [playerKey, heartbeat] of playerHeartbeats.entries()) {
    if (playerKey.startsWith(`${gameId}:`)) {
      clearTimeout(heartbeat.timeout)
      playerHeartbeats.delete(playerKey)
    }
  }
  
  console.log(`[Player Disconnect Handler] Cleaned up game ${gameId}`)
}

// 플레이어 정리
export function cleanupPlayer(gameId: string, playerLabel: string): void {
  // 플레이어 하트비트 정리
  cleanupPlayerHeartbeat(gameId, playerLabel)
  
  // 게임 연결 상태에서 플레이어 제거
  const gameState = gameConnectionStates.get(gameId)
  if (gameState) {
    gameState.players = gameState.players.filter(p => p.playerLabel !== playerLabel)
    gameState.totalPlayers = gameState.players.length
    gameState.connectedPlayers = gameState.players.filter(p => p.status === 'connected').length
    gameState.disconnectedPlayers = gameState.players.filter(p => p.status === 'disconnected').length
    gameState.lastUpdate = new Date().toISOString()
  }
  
  console.log(`[Player Disconnect Handler] Cleaned up player ${playerLabel} from game ${gameId}`)
}
