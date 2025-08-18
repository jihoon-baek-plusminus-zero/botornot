import { 
  DisconnectReason, 
  PlayerConnectionState, 
  DisconnectNotification 
} from '@/types/player-disconnect'

const API_BASE_URL = '/api/player/disconnect'

// 하트비트 전송
export async function sendHeartbeat(gameId: string, playerLabel: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'heartbeat',
        gameId,
        playerLabel
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending heartbeat:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// 하트비트 시작
export function startHeartbeat(
  gameId: string, 
  playerLabel: string, 
  interval: number = 30000, // 30초
  onFailure?: (error: string) => void
): () => void {
  let isActive = true
  let heartbeatInterval: NodeJS.Timeout | null = null

  const sendHeartbeatWithRetry = async () => {
    if (!isActive) return

    try {
      const result = await sendHeartbeat(gameId, playerLabel)
      
      if (!result.success) {
        console.warn('Heartbeat failed:', result.error)
        if (onFailure) {
          onFailure(result.error || 'Heartbeat failed')
        }
      }
    } catch (error) {
      console.error('Heartbeat error:', error)
      if (onFailure) {
        onFailure(error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  // 즉시 첫 번째 하트비트 전송
  sendHeartbeatWithRetry()

  // 주기적 하트비트 설정
  heartbeatInterval = setInterval(sendHeartbeatWithRetry, interval)

  // 정리 함수 반환
  return () => {
    isActive = false
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }
}

// 하트비트 중지
export function stopHeartbeat(): void {
  // 하트비트는 startHeartbeat에서 반환된 정리 함수로 중지
  // 이 함수는 호환성을 위해 유지
}

// 하트비트 실패 처리
export function handleHeartbeatFailure(
  gameId: string, 
  playerLabel: string, 
  error: string
): void {
  console.error(`Heartbeat failure for player ${playerLabel} in game ${gameId}:`, error)
  
  // 실패 알림 표시
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('BotOrNot Game - Connection Warning', {
      body: '연결이 불안정합니다. 네트워크를 확인해주세요.',
      icon: '/favicon.ico'
    })
  }
}

// 재연결 시도
export async function attemptReconnect(
  gameId: string, 
  playerLabel: string,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Reconnection attempt ${attempt}/${maxRetries}`)
      
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reconnect',
          gameId,
          playerLabel
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('Reconnection successful')
        return { success: true }
      } else {
        throw new Error(data.error || 'Reconnection failed')
      }
    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Max retries exceeded' 
        }
      }
      
      // 지수 백오프: 1초, 2초, 4초, 8초, 16초
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

// 연결 해제 처리
export async function handleDisconnect(
  gameId: string, 
  playerLabel: string, 
  reason: DisconnectReason = 'manual_disconnect'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'disconnect',
        gameId,
        playerLabel,
        reason
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error handling disconnect:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// 연결 상태 조회
export async function getConnectionState(
  gameId: string, 
  playerLabel?: string
): Promise<{ success: boolean; data?: PlayerConnectionState; error?: string }> {
  try {
    const params = new URLSearchParams()
    params.append('gameId', gameId)
    if (playerLabel) {
      params.append('playerLabel', playerLabel)
    }

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true, data: data.data }
  } catch (error) {
    console.error('Error getting connection state:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// 연결 상태 모니터링
export function monitorConnectionState(
  gameId: string,
  playerLabel: string,
  onStateChange?: (state: PlayerConnectionState) => void,
  onDisconnect?: (reason: DisconnectReason) => void,
  interval: number = 5000
): () => void {
  let isMonitoring = true
  let lastState: PlayerConnectionState | null = null

  const checkConnection = async () => {
    if (!isMonitoring) return

    try {
      const result = await getConnectionState(gameId, playerLabel)
      
      if (result.success && result.data) {
        const currentState = result.data
        
        // 상태 변경 감지
        if (lastState && lastState.status !== currentState.status) {
          if (onStateChange) {
            onStateChange(currentState)
          }
          
          if (currentState.status === 'disconnected' && onDisconnect) {
            onDisconnect(currentState.disconnectReason || 'unknown')
          }
        }
        
        lastState = currentState
      }
    } catch (error) {
      console.error('Error monitoring connection state:', error)
    }
    
    if (isMonitoring) {
      setTimeout(checkConnection, interval)
    }
  }

  checkConnection()

  return () => {
    isMonitoring = false
  }
}

// 브라우저 이벤트 리스너 설정
export function setupBrowserEventListeners(
  gameId: string,
  playerLabel: string,
  onDisconnect?: (reason: DisconnectReason) => void
): () => void {
  const cleanupFunctions: (() => void)[] = []

  // 페이지 언로드 시 연결 해제
  const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
    try {
      await handleDisconnect(gameId, playerLabel, 'browser_close')
    } catch (error) {
      console.error('Error handling beforeunload disconnect:', error)
    }
  }

  // 페이지 가시성 변경 시 처리
  const handleVisibilityChange = async () => {
    if (document.hidden) {
      try {
        await handleDisconnect(gameId, playerLabel, 'page_hidden')
      } catch (error) {
        console.error('Error handling visibility change disconnect:', error)
      }
    } else {
      // 페이지가 다시 보이면 재연결 시도
      try {
        await attemptReconnect(gameId, playerLabel)
      } catch (error) {
        console.error('Error handling visibility change reconnect:', error)
      }
    }
  }

  // 온라인/오프라인 상태 변경
  const handleOnline = async () => {
    console.log('Network connection restored')
    try {
      await attemptReconnect(gameId, playerLabel)
    } catch (error) {
      console.error('Error handling online reconnect:', error)
    }
  }

  const handleOffline = async () => {
    console.log('Network connection lost')
    if (onDisconnect) {
      onDisconnect('network_error')
    }
  }

  // 이벤트 리스너 등록
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  cleanupFunctions.push(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  // 정리 함수 반환
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup())
  }
}

// 자동 재연결 설정
export function setupAutoReconnect(
  gameId: string,
  playerLabel: string,
  onReconnect?: () => void,
  onReconnectFailed?: (error: string) => void
): () => void {
  let isActive = true
  let reconnectTimeout: NodeJS.Timeout | null = null

  const attemptReconnectWithCallback = async () => {
    if (!isActive) return

    try {
      const result = await attemptReconnect(gameId, playerLabel)
      
      if (result.success) {
        console.log('Auto-reconnection successful')
        if (onReconnect) {
          onReconnect()
        }
      } else {
        console.error('Auto-reconnection failed:', result.error)
        if (onReconnectFailed) {
          onReconnectFailed(result.error || 'Reconnection failed')
        }
        
        // 실패 시 다시 시도 (지수 백오프)
        if (isActive) {
          const delay = Math.random() * 5000 + 5000 // 5-10초 랜덤 지연
          reconnectTimeout = setTimeout(attemptReconnectWithCallback, delay)
        }
      }
    } catch (error) {
      console.error('Auto-reconnection error:', error)
      if (onReconnectFailed) {
        onReconnectFailed(error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  // 네트워크 복구 시 자동 재연결
  const handleOnline = () => {
    if (isActive) {
      attemptReconnectWithCallback()
    }
  }

  window.addEventListener('online', handleOnline)

  // 정리 함수 반환
  return () => {
    isActive = false
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    window.removeEventListener('online', handleOnline)
  }
}

// 모든 하트비트 정리
export function cleanupAllHeartbeats(): void {
  // 이 함수는 전역적으로 모든 하트비트를 정리하는 용도
  // 실제로는 각 하트비트의 정리 함수를 호출해야 함
  console.log('Cleaning up all heartbeats')
}

// 연결 요약 정보 조회
export async function getConnectionSummary(gameId: string): Promise<{
  success: boolean;
  data?: {
    totalPlayers: number;
    connectedPlayers: number;
    disconnectedPlayers: number;
    players: Array<{
      label: string;
      status: string;
      lastSeen?: string;
    }>;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}?gameId=${gameId}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true, data: data.data }
  } catch (error) {
    console.error('Error getting connection summary:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// 연결 알림 표시
export function showConnectionNotification(notification: DisconnectNotification): void {
  // 브라우저 알림
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('BotOrNot Game - Connection Status', {
      body: notification.message,
      icon: '/favicon.ico'
    })
  }
  
  // 콘솔 로그
  console.log(`[Connection Notification] ${notification.message}`)
  
  // 토스트 메시지 표시 (UI 컴포넌트가 있다면)
  // showToast(notification.message, notification.type === 'reconnect' ? 'success' : 'warning')
}

// 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }
  return false
}
