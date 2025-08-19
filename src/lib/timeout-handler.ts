import { 
  TimeoutType, 
  TimeoutReason, 
  TimeoutEvent, 
  GameTimeoutConfig,
  TimeoutHandlerRequest,
  TimeoutStats,
  TimeoutNotification
} from '@/types/timeout'
import { createServerClient } from './supabase'
import { broadcastTimeoutEvent, broadcastTimeoutNotification } from './realtime'
import { triggerAIVotingForAllAIPlayers } from './ai-voting-client'

// 기본 타임아웃 설정
const DEFAULT_TIMEOUT_CONFIG: GameTimeoutConfig = {
  gameTimeout: {
    '1v1': 120000, // 2분
    '1vn': 300000  // 5분
  },
  turnTimeout: 10000,    // 10초
  voteTimeout: 10000,    // 10초
  autoSkipEnabled: true,
  autoVoteEnabled: true,
  aiActionDelay: 2000    // AI 액션 지연 시간
}

// 메모리 기반 저장소 (프로덕션에서는 Redis 사용 권장)
const activeTimeouts: Map<string, NodeJS.Timeout> = new Map()
const timeoutStats: TimeoutStats = {
  totalTimeouts: 0,
  gameTimeouts: 0,
  turnTimeouts: 0,
  voteTimeouts: 0,
  aiAutoActions: 0,
  lastTimeout?: new Date().toISOString()
}

// 게임 타임아웃 시작
export function startGameTimeout(
  gameId: string, 
  gameType: '1v1' | '1vn',
  onTimeout?: (event: TimeoutEvent) => void
): void {
  const timeoutDuration = DEFAULT_TIMEOUT_CONFIG.gameTimeout[gameType]
  const timeoutKey = `game:${gameId}`
  
  // 기존 타임아웃 정리
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
  }
  
  const timeout = setTimeout(async () => {
    console.log(`[Timeout Handler] Game timeout for ${gameId} (${gameType})`)
    
    const timeoutEvent: TimeoutEvent = {
      type: 'game_timeout',
      gameId,
      reason: 'game_duration_exceeded',
      timestamp: new Date().toISOString(),
      metadata: {
        gameType,
        duration: timeoutDuration
      }
    }
    
    await handleGameTimeout(timeoutEvent)
    
    if (onTimeout) {
      onTimeout(timeoutEvent)
    }
  }, timeoutDuration)
  
  activeTimeouts.set(timeoutKey, timeout)
  console.log(`[Timeout Handler] Game timeout started for ${gameId} (${timeoutDuration}ms)`)
}

// 게임 타임아웃 중지
export function stopGameTimeout(gameId: string): void {
  const timeoutKey = `game:${gameId}`
  
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
    activeTimeouts.delete(timeoutKey)
    console.log(`[Timeout Handler] Game timeout stopped for ${gameId}`)
  }
}

// 턴 타임아웃 시작
export function startTurnTimeout(
  gameId: string, 
  playerLabel: string,
  onTimeout?: (event: TimeoutEvent) => void
): void {
  const timeoutDuration = DEFAULT_TIMEOUT_CONFIG.turnTimeout
  const timeoutKey = `turn:${gameId}:${playerLabel}`
  
  // 기존 타임아웃 정리
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
  }
  
  const timeout = setTimeout(async () => {
    console.log(`[Timeout Handler] Turn timeout for ${playerLabel} in game ${gameId}`)
    
    const timeoutEvent: TimeoutEvent = {
      type: 'turn_timeout',
      gameId,
      playerLabel,
      reason: 'turn_duration_exceeded',
      timestamp: new Date().toISOString(),
      metadata: {
        duration: timeoutDuration
      }
    }
    
    await handleTurnTimeout(timeoutEvent)
    
    if (onTimeout) {
      onTimeout(timeoutEvent)
    }
  }, timeoutDuration)
  
  activeTimeouts.set(timeoutKey, timeout)
  console.log(`[Timeout Handler] Turn timeout started for ${playerLabel} in ${gameId} (${timeoutDuration}ms)`)
}

// 턴 타임아웃 중지
export function stopTurnTimeout(gameId: string, playerLabel: string): void {
  const timeoutKey = `turn:${gameId}:${playerLabel}`
  
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
    activeTimeouts.delete(timeoutKey)
    console.log(`[Timeout Handler] Turn timeout stopped for ${playerLabel} in ${gameId}`)
  }
}

// 투표 타임아웃 시작
export function startVoteTimeout(
  gameId: string,
  onTimeout?: (event: TimeoutEvent) => void
): void {
  const timeoutDuration = DEFAULT_TIMEOUT_CONFIG.voteTimeout
  const timeoutKey = `vote:${gameId}`
  
  // 기존 타임아웃 정리
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
  }
  
  const timeout = setTimeout(async () => {
    console.log(`[Timeout Handler] Vote timeout for game ${gameId}`)
    
    const timeoutEvent: TimeoutEvent = {
      type: 'vote_timeout',
      gameId,
      reason: 'vote_duration_exceeded',
      timestamp: new Date().toISOString(),
      metadata: {
        duration: timeoutDuration
      }
    }
    
    await handleVoteTimeout(timeoutEvent)
    
    if (onTimeout) {
      onTimeout(timeoutEvent)
    }
  }, timeoutDuration)
  
  activeTimeouts.set(timeoutKey, timeout)
  console.log(`[Timeout Handler] Vote timeout started for ${gameId} (${timeoutDuration}ms)`)
}

// 투표 타임아웃 중지
export function stopVoteTimeout(gameId: string): void {
  const timeoutKey = `vote:${gameId}`
  
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey)!)
    activeTimeouts.delete(timeoutKey)
    console.log(`[Timeout Handler] Vote timeout stopped for ${gameId}`)
  }
}

// 게임 타임아웃 처리
async function handleGameTimeout(event: TimeoutEvent): Promise<void> {
  try {
    const { gameId } = event
    
    console.log(`[Timeout Handler] Processing game timeout for ${gameId}`)
    
    // 게임 상태를 'finished'로 변경
    const supabase = createServerClient()
    await supabase
      .from('games')
      .update({ 
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)
    
    // 시스템 메시지 추가
    await addTimeoutSystemMessage(gameId, '게임 시간이 종료되었습니다.')
    
    // AI 플레이어들의 최종 투표 트리거
    if (DEFAULT_TIMEOUT_CONFIG.autoVoteEnabled) {
      setTimeout(async () => {
        try {
          await triggerAIVotingForAllAIPlayers(gameId)
        } catch (error) {
          console.error(`[Timeout Handler] Error triggering AI voting for game ${gameId}:`, error)
        }
      }, DEFAULT_TIMEOUT_CONFIG.aiActionDelay)
    }
    
    // 타임아웃 이벤트 브로드캐스트
    await broadcastTimeoutEvent(gameId, event)
    
    // 타임아웃 알림 브로드캐스트
    await broadcastTimeoutNotification(gameId, {
      type: 'game_timeout',
      gameId,
      message: '게임 시간이 종료되었습니다.',
      timestamp: new Date().toISOString()
    })
    
    // 통계 업데이트
    updateTimeoutStats('game_timeout')
    
    console.log(`[Timeout Handler] Game timeout processed for ${gameId}`)
    
  } catch (error) {
    console.error(`[Timeout Handler] Error processing game timeout for ${event.gameId}:`, error)
  }
}

// 턴 타임아웃 처리
async function handleTurnTimeout(event: TimeoutEvent): Promise<void> {
  try {
    const { gameId, playerLabel } = event
    
    console.log(`[Timeout Handler] Processing turn timeout for ${playerLabel} in ${gameId}`)
    
    // 플레이어가 AI인지 확인
    const supabase = createServerClient()
    const { data: player } = await supabase
      .from('players')
      .select('is_ai')
      .eq('game_id', gameId)
      .eq('label', playerLabel)
      .single()
    
    if (player?.is_ai && DEFAULT_TIMEOUT_CONFIG.autoSkipEnabled) {
      // AI 플레이어의 경우 자동 스킵
      console.log(`[Timeout Handler] Auto-skipping AI player ${playerLabel}`)
      
      // AI 턴 처리 (메시지 생성 또는 스킵)
      setTimeout(async () => {
        try {
          // AI 턴 처리 로직 (실제 구현에서는 AI 턴 핸들러 호출)
          console.log(`[Timeout Handler] Processing AI turn for ${playerLabel}`)
        } catch (error) {
          console.error(`[Timeout Handler] Error processing AI turn for ${playerLabel}:`, error)
        }
      }, DEFAULT_TIMEOUT_CONFIG.aiActionDelay)
      
      updateTimeoutStats('ai_auto_action')
    } else {
      // 사람 플레이어의 경우 스킵 메시지 추가
      await addTimeoutSystemMessage(gameId, `Player ${playerLabel}의 턴이 스킵되었습니다.`)
    }
    
    // 타임아웃 이벤트 브로드캐스트
    await broadcastTimeoutEvent(gameId, event)
    
    // 타임아웃 알림 브로드캐스트
    await broadcastTimeoutNotification(gameId, {
      type: 'turn_timeout',
      gameId,
      playerLabel,
      message: `Player ${playerLabel}의 턴이 시간 초과로 스킵되었습니다.`,
      timestamp: new Date().toISOString()
    })
    
    // 통계 업데이트
    updateTimeoutStats('turn_timeout')
    
    console.log(`[Timeout Handler] Turn timeout processed for ${playerLabel} in ${gameId}`)
    
  } catch (error) {
    console.error(`[Timeout Handler] Error processing turn timeout for ${event.playerLabel} in ${event.gameId}:`, error)
  }
}

// 투표 타임아웃 처리
async function handleVoteTimeout(event: TimeoutEvent): Promise<void> {
  try {
    const { gameId } = event
    
    console.log(`[Timeout Handler] Processing vote timeout for ${gameId}`)
    
    // AI 플레이어들의 자동 투표
    if (DEFAULT_TIMEOUT_CONFIG.autoVoteEnabled) {
      setTimeout(async () => {
        try {
          await triggerAIVotingForAllAIPlayers(gameId)
        } catch (error) {
          console.error(`[Timeout Handler] Error triggering AI voting for game ${gameId}:`, error)
        }
      }, DEFAULT_TIMEOUT_CONFIG.aiActionDelay)
    }
    
    // 시스템 메시지 추가
    await addTimeoutSystemMessage(gameId, '투표 시간이 종료되었습니다.')
    
    // 타임아웃 이벤트 브로드캐스트
    await broadcastTimeoutEvent(gameId, event)
    
    // 타임아웃 알림 브로드캐스트
    await broadcastTimeoutNotification(gameId, {
      type: 'vote_timeout',
      gameId,
      message: '투표 시간이 종료되었습니다.',
      timestamp: new Date().toISOString()
    })
    
    // 통계 업데이트
    updateTimeoutStats('vote_timeout')
    
    console.log(`[Timeout Handler] Vote timeout processed for ${gameId}`)
    
  } catch (error) {
    console.error(`[Timeout Handler] Error processing vote timeout for ${event.gameId}:`, error)
  }
}

// 타임아웃 이벤트 처리 (통합 엔트리 포인트)
export async function handleTimeoutEvent(request: TimeoutHandlerRequest): Promise<any> {
  try {
    const { gameId, type, playerLabel, reason } = request
    
    const timeoutEvent: TimeoutEvent = {
      type,
      gameId,
      playerLabel,
      reason: reason || 'manual_timeout',
      timestamp: new Date().toISOString()
    }
    
    switch (type) {
      case 'game_timeout':
        await handleGameTimeout(timeoutEvent)
        break
      case 'turn_timeout':
        await handleTurnTimeout(timeoutEvent)
        break
      case 'vote_timeout':
        await handleVoteTimeout(timeoutEvent)
        break
      default:
        throw new Error(`Unknown timeout type: ${type}`)
    }
    
    return {
      success: true,
      gameId,
      type,
      message: 'Timeout event processed successfully'
    }
    
  } catch (error) {
    console.error('[Timeout Handler] Error handling timeout event:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 타임아웃 시스템 메시지 추가
async function addTimeoutSystemMessage(gameId: string, message: string): Promise<void> {
  const supabase = createServerClient()
  
  await supabase
    .from('messages')
    .insert([{
      game_id: gameId,
      player_label: 'SYSTEM',
      content: message,
      is_system_message: true,
      created_at: new Date().toISOString()
    }])
}

// 타임아웃 통계 업데이트
function updateTimeoutStats(type: 'game_timeout' | 'turn_timeout' | 'vote_timeout' | 'ai_auto_action'): void {
  timeoutStats.totalTimeouts++
  timeoutStats.lastTimeout = new Date().toISOString()
  
  switch (type) {
    case 'game_timeout':
      timeoutStats.gameTimeouts++
      break
    case 'turn_timeout':
      timeoutStats.turnTimeouts++
      break
    case 'vote_timeout':
      timeoutStats.voteTimeouts++
      break
    case 'ai_auto_action':
      timeoutStats.aiAutoActions++
      break
  }
}

// 타임아웃 통계 조회
export function getTimeoutStats(): TimeoutStats {
  return { ...timeoutStats }
}

// 타임아웃 통계 초기화
export function resetTimeoutStats(): void {
  Object.assign(timeoutStats, {
    totalTimeouts: 0,
    gameTimeouts: 0,
    turnTimeouts: 0,
    voteTimeouts: 0,
    aiAutoActions: 0
  })
}

// 타임아웃 설정 업데이트
export function updateTimeoutConfig(config: Partial<GameTimeoutConfig>): void {
  Object.assign(DEFAULT_TIMEOUT_CONFIG, config)
}

// 모든 타임아웃 정리
export function cleanupAllTimeouts(): void {
  console.log('[Timeout Handler] Cleaning up all timeouts...')
  
  for (const [key, timeout] of activeTimeouts.entries()) {
    clearTimeout(timeout)
  }
  activeTimeouts.clear()
  
  console.log('[Timeout Handler] All timeouts cleaned up')
}

// 게임 타임아웃 정리
export function cleanupGameTimeouts(gameId: string): void {
  console.log(`[Timeout Handler] Cleaning up timeouts for game ${gameId}`)
  
  // 게임 관련 모든 타임아웃 정리
  for (const [key, timeout] of activeTimeouts.entries()) {
    if (key.includes(gameId)) {
      clearTimeout(timeout)
      activeTimeouts.delete(key)
    }
  }
  
  console.log(`[Timeout Handler] Timeouts cleaned up for game ${gameId}`)
}
