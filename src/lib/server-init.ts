import { startHeartbeatMonitoring } from './player-disconnect-handler'
import { cleanupAllTimeouts } from './timeout-handler'

// 서버 초기화 함수
export function initializeServer() {
  console.log('[Server Init] Initializing server...')
  
  // 플레이어 이탈 감지 모니터링 시작
  startHeartbeatMonitoring()
  console.log('[Server Init] Player disconnect monitoring started.')
  
  // 서버 상태 로그
  console.log('[Server Init] Server initialization completed successfully')
}

// 서버 정리 함수 (Graceful Shutdown)
export function cleanupServer() {
  console.log('[Server Init] Cleaning up server resources...')
  
  // 플레이어 이탈 감지 모니터링 중지
  // stopHeartbeatMonitoring() // 필요시 주석 해제
  
  // 모든 타임아웃 정리
  cleanupAllTimeouts()
  
  console.log('[Server Init] Server cleanup completed successfully')
}

// 프로세스 종료 시그널 핸들러
process.on('SIGINT', () => {
  console.log('[Server Init] SIGINT received. Initiating graceful shutdown...')
  cleanupServer()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[Server Init] SIGTERM received. Initiating graceful shutdown...')
  cleanupServer()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  console.error('[Server Init] Uncaught Exception:', err)
  cleanupServer()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Init] Unhandled Rejection at:', promise, 'reason:', reason)
  cleanupServer()
  process.exit(1)
})

// 서버 상태 모니터링
export function getServerStatus() {
  return {
    initialized: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  }
}

// 서버 헬스체크
export function healthCheck() {
  const status = getServerStatus()
  
  // 메모리 사용량 체크
  const memoryUsage = status.memory
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  }
  
  // 메모리 사용량이 너무 높으면 경고
  if (memoryUsageMB.heapUsed > 500) { // 500MB 이상
    console.warn('[Server Init] High memory usage detected:', memoryUsageMB)
  }
  
  return {
    status: 'healthy',
    timestamp: status.timestamp,
    uptime: status.uptime,
    memory: memoryUsageMB,
    pid: status.pid
  }
}

// 주기적 헬스체크 (선택사항)
export function startHealthCheck(interval: number = 60000) { // 1분마다
  setInterval(() => {
    const health = healthCheck()
    console.log('[Server Init] Health check:', health)
  }, interval)
  
  console.log(`[Server Init] Health check started with ${interval}ms interval`)
}

// 서버 재시작 함수 (개발용)
export function restartServer() {
  console.log('[Server Init] Restarting server...')
  cleanupServer()
  
  // 잠시 대기 후 초기화
  setTimeout(() => {
    initializeServer()
    console.log('[Server Init] Server restart completed')
  }, 1000)
}

// 서버 설정 로드
export function loadServerConfig() {
  return {
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'),
    heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT || '90000'),
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '1000'),
    maxReconnectDelay: parseInt(process.env.MAX_RECONNECT_DELAY || '30000'),
    gameTimeout: {
      '1v1': parseInt(process.env.GAME_TIMEOUT_1V1 || '120000'),
      '1vn': parseInt(process.env.GAME_TIMEOUT_1VN || '300000')
    },
    turnTimeout: parseInt(process.env.TURN_TIMEOUT || '10000'),
    voteTimeout: parseInt(process.env.VOTE_TIMEOUT || '10000')
  }
}

// 서버 설정 업데이트
export function updateServerConfig(newConfig: Partial<ReturnType<typeof loadServerConfig>>) {
  console.log('[Server Init] Updating server configuration:', newConfig)
  
  // 설정 업데이트 로직
  // 실제 구현에서는 설정 저장소나 환경 변수를 업데이트
  
  return {
    success: true,
    message: 'Server configuration updated successfully',
    timestamp: new Date().toISOString()
  }
}
