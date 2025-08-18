import { createServerClient } from './supabase'
import { broadcastTurnChange, broadcastTurnTimerUpdate } from './realtime'
import { 
  TurnChangeRequest, 
  TurnChangeResponse, 
  TurnTimerConfig,
  TurnManagementState,
  PlayerLabel,
  TurnStatus
} from '@/types/turn-management'
import { GameStatus } from '@/types/game'
import { generateId } from './utils'
import { handleAITurn } from './ai-turn-handler'
import { AITurnRequest } from '@/types/ai-turn'

// 턴 타이머 설정
const TURN_TIMER_CONFIG: TurnTimerConfig = {
  defaultTurnTime: 10, // 10초
  warningTime: 3, // 3초 남았을 때 경고
  autoSkipTime: 0, // 0초가 되면 자동 스킵
  gracePeriod: 2 // 2초 여유 시간
}

// 활성 게임의 턴 관리 상태 (메모리 기반, 실제로는 Redis 권장)
const turnStates: Map<string, TurnManagementState> = new Map()

/**
 * 턴 관리 상태 초기화
 */
export function initializeTurnManagement(gameId: string, firstPlayer: PlayerLabel): TurnManagementState {
  const turnState: TurnManagementState = {
    gameId,
    currentTurn: firstPlayer,
    turnTimeRemaining: TURN_TIMER_CONFIG.defaultTurnTime,
    turnStatus: 'active',
    turnStartTime: new Date().toISOString(),
    lastActivityTime: new Date().toISOString(),
    skippedTurns: [],
    totalTurns: 1
  }

  turnStates.set(gameId, turnState)
  return turnState
}

/**
 * 다음 플레이어 찾기
 */
export function getNextPlayer(
  currentPlayer: PlayerLabel,
  activePlayers: PlayerLabel[]
): PlayerLabel {
  const playerOrder: PlayerLabel[] = ['A', 'B', 'C', 'D', 'E']
  const currentIndex = playerOrder.indexOf(currentPlayer)
  
  // 현재 플레이어부터 다음 플레이어를 찾기
  for (let i = 1; i <= playerOrder.length; i++) {
    const nextIndex = (currentIndex + i) % playerOrder.length
    const nextPlayer = playerOrder[nextIndex]
    
    // 활성 플레이어인지 확인
    if (activePlayers.includes(nextPlayer)) {
      return nextPlayer
    }
  }
  
  // 활성 플레이어가 없으면 첫 번째 플레이어 반환
  return activePlayers[0] || 'A'
}

/**
 * 턴 변경 처리
 */
export async function changeTurn(request: TurnChangeRequest): Promise<TurnChangeResponse> {
  const { gameId, nextPlayerLabel, reason, turnTimeRemaining = TURN_TIMER_CONFIG.defaultTurnTime } = request

  try {
    const supabase = createServerClient()

    // 게임 존재 및 상태 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, current_turn')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return {
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }
    }

    if (game.status !== 'active') {
      return {
        success: false,
        error: '게임이 활성 상태가 아닙니다.'
      }
    }

    // 활성 플레이어 목록 조회
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_label')
      .eq('game_id', gameId)
      .eq('status', 'active')

    if (playersError || !players) {
      return {
        success: false,
        error: '플레이어 정보를 조회할 수 없습니다.'
      }
    }

    const activePlayers = players.map(p => p.player_label as PlayerLabel)

    // 다음 플레이어가 활성 상태인지 확인
    if (!activePlayers.includes(nextPlayerLabel)) {
      return {
        success: false,
        error: '다음 플레이어가 활성 상태가 아닙니다.'
      }
    }

    // 현재 턴 상태 가져오기
    const currentTurnState = turnStates.get(gameId)
    const previousTurn = currentTurnState?.currentTurn || game.current_turn

    // 턴 변경 처리
    const { error: updateError } = await supabase
      .from('games')
      .update({
        current_turn: nextPlayerLabel,
        turn_time_remaining: turnTimeRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (updateError) {
      console.error('Failed to update turn:', updateError)
      return {
        success: false,
        error: '턴 변경에 실패했습니다.'
      }
    }

    // 턴 관리 상태 업데이트
    const newTurnState: TurnManagementState = {
      gameId,
      currentTurn: nextPlayerLabel,
      turnTimeRemaining,
      turnStatus: 'active',
      turnStartTime: new Date().toISOString(),
      lastActivityTime: new Date().toISOString(),
      skippedTurns: currentTurnState?.skippedTurns || [],
      totalTurns: (currentTurnState?.totalTurns || 0) + 1
    }

    turnStates.set(gameId, newTurnState)

    // 턴 변경 이벤트 브로드캐스트
    try {
      await broadcastTurnChange(gameId, {
        currentTurn: nextPlayerLabel,
        turnTimeRemaining,
        previousTurn: previousTurn as PlayerLabel
      })
    } catch (broadcastError) {
      console.error('Failed to broadcast turn change:', broadcastError)
      // 브로드캐스트 실패는 턴 변경 실패로 처리하지 않음
    }

    // 턴 변경 로그 저장
    await logTurnChange(gameId, previousTurn, nextPlayerLabel, reason)

    // AI 플레이어 확인 및 AI 턴 처리 트리거
    await triggerAITurnIfNeeded(gameId, nextPlayerLabel)

    return {
      success: true,
      newTurn: nextPlayerLabel,
      turnTimeRemaining
    }

  } catch (error) {
    console.error('Change turn error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '턴 변경 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 턴 타이머 업데이트
 */
export async function updateTurnTimer(gameId: string): Promise<void> {
  const turnState = turnStates.get(gameId)
  if (!turnState || turnState.turnStatus !== 'active') {
    return
  }

  // 타이머 감소
  turnState.turnTimeRemaining = Math.max(0, turnState.turnTimeRemaining - 1)

  // 경고 시간 확인
  const isWarning = turnState.turnTimeRemaining <= TURN_TIMER_CONFIG.warningTime

  // 타이머 업데이트 브로드캐스트
  try {
    await broadcastTurnTimerUpdate(gameId, {
      timeRemaining: turnState.turnTimeRemaining,
      isWarning
    })
  } catch (broadcastError) {
    console.error('Failed to broadcast timer update:', broadcastError)
  }

  // 자동 스킵 처리
  if (turnState.turnTimeRemaining <= TURN_TIMER_CONFIG.autoSkipTime) {
    await handleTurnTimeout(gameId, turnState.currentTurn!)
  }
}

/**
 * 턴 타임아웃 처리
 */
async function handleTurnTimeout(gameId: string, currentPlayer: PlayerLabel): Promise<void> {
  try {
    // 타임아웃 상태로 변경
    const turnState = turnStates.get(gameId)
    if (turnState) {
      turnState.turnStatus = 'timeout'
      turnState.skippedTurns.push(currentPlayer)
    }

    // "Skipped" 메시지 추가
    await addSkippedMessage(gameId, currentPlayer)

    // 다음 플레이어로 턴 변경
    const supabase = createServerClient()
    const { data: players } = await supabase
      .from('players')
      .select('player_label')
      .eq('game_id', gameId)
      .eq('status', 'active')

    if (players) {
      const activePlayers = players.map(p => p.player_label as PlayerLabel)
      const nextPlayer = getNextPlayer(currentPlayer, activePlayers)

      await changeTurn({
        gameId,
        nextPlayerLabel: nextPlayer,
        reason: 'timeout'
      })
    }

  } catch (error) {
    console.error('Handle turn timeout error:', error)
  }
}

/**
 * 메시지 전송 시 턴 자동 변경
 */
export async function handleMessageSent(gameId: string, playerLabel: PlayerLabel): Promise<void> {
  try {
    const turnState = turnStates.get(gameId)
    if (!turnState || turnState.currentTurn !== playerLabel) {
      return
    }

    // 마지막 활동 시간 업데이트
    turnState.lastActivityTime = new Date().toISOString()

    // 다음 플레이어로 턴 변경
    const supabase = createServerClient()
    const { data: players } = await supabase
      .from('players')
      .select('player_label')
      .eq('game_id', gameId)
      .eq('status', 'active')

    if (players) {
      const activePlayers = players.map(p => p.player_label as PlayerLabel)
      const nextPlayer = getNextPlayer(playerLabel, activePlayers)

      await changeTurn({
        gameId,
        nextPlayerLabel: nextPlayer,
        reason: 'message_sent'
      })
    }

  } catch (error) {
    console.error('Handle message sent error:', error)
  }
}

/**
 * 턴 변경 로그 저장
 */
async function logTurnChange(
  gameId: string,
  previousTurn: PlayerLabel | null,
  nextTurn: PlayerLabel,
  reason: string
): Promise<void> {
  const supabase = createServerClient()

  try {
    await supabase
      .from('turn_logs')
      .insert({
        id: generateId(),
        game_id: gameId,
        previous_turn: previousTurn,
        next_turn: nextTurn,
        reason,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log turn change:', error)
  }
}

/**
 * "Skipped" 메시지 추가
 */
async function addSkippedMessage(gameId: string, playerLabel: PlayerLabel): Promise<void> {
  const supabase = createServerClient()

  try {
    await supabase
      .from('messages')
      .insert({
        id: generateId(),
        game_id: gameId,
        player_label: playerLabel,
        content: 'Skipped',
        timestamp: new Date().toISOString(),
        is_system_message: true
      })
  } catch (error) {
    console.error('Failed to add skipped message:', error)
  }
}

/**
 * 턴 관리 상태 조회
 */
export function getTurnState(gameId: string): TurnManagementState | null {
  return turnStates.get(gameId) || null
}

/**
 * 턴 관리 상태 정리
 */
export function cleanupTurnState(gameId: string): void {
  turnStates.delete(gameId)
}

/**
 * 턴 타이머 설정 업데이트
 */
export function updateTurnTimerConfig(config: Partial<TurnTimerConfig>): void {
  Object.assign(TURN_TIMER_CONFIG, config)
}

/**
 * 턴 히스토리 조회
 */
export async function getTurnHistory(gameId: string): Promise<any[]> {
  const supabase = createServerClient()

  try {
    const { data, error } = await supabase
      .from('turn_logs')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Failed to get turn history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get turn history error:', error)
    return []
  }
}

/**
 * AI 턴 처리 트리거
 */
async function triggerAITurnIfNeeded(gameId: string, playerLabel: PlayerLabel): Promise<void> {
  try {
    const supabase = createServerClient()

    // 플레이어 정보 조회 (AI 여부 확인)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('is_ai, persona_id')
      .eq('game_id', gameId)
      .eq('player_label', playerLabel)
      .single()

    if (playerError || !player || !player.is_ai) {
      return // AI 플레이어가 아니면 처리하지 않음
    }

    // 게임 정보 조회
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('game_type, current_topic, time_remaining, status, vote_count, total_players')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Failed to get game info for AI turn:', gameError)
      return
    }

    // 대화 히스토리 조회
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('player_label, content, timestamp, is_system_message')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })
      .limit(50) // 최근 50개 메시지만

    if (messagesError) {
      console.error('Failed to get conversation history for AI turn:', messagesError)
      return
    }

    // 활성 플레이어 목록 조회
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_label, name, is_ai, status')
      .eq('game_id', gameId)
      .eq('status', 'active')

    if (playersError || !players) {
      console.error('Failed to get players for AI turn:', playersError)
      return
    }

    // 투표 정보 조회
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('player_label')
      .eq('game_id', gameId)

    if (votesError) {
      console.error('Failed to get votes for AI turn:', votesError)
      return
    }

    const voteCount = votes?.length || 0

    // AI 턴 처리 요청 생성
    const aiTurnRequest: AITurnRequest = {
      gameId,
      playerLabel,
      personaId: player.persona_id || 1,
      gameType: game.game_type as '1v1' | '1vn',
      currentTopic: game.current_topic || '일반적인 대화',
      conversationHistory: (messages || []).map(msg => ({
        playerLabel: msg.player_label as PlayerLabel,
        content: msg.content,
        timestamp: msg.timestamp,
        isSystemMessage: msg.is_system_message || false
      })),
      turnTimeRemaining: 10, // 기본값
      gameStatus: game.status as 'active' | 'voting' | 'finished',
      voteCount,
      totalPlayers: game.total_players || players.length,
      timeRemaining: game.time_remaining || 120,
      currentTurn: playerLabel,
      players: players.map(p => ({
        label: p.player_label as PlayerLabel,
        name: p.name,
        isAI: p.is_ai,
        isActive: p.status === 'active',
        hasVoted: votes?.some(v => v.player_label === p.player_label) || false
      }))
    }

    // AI 턴 처리 비동기 실행 (응답을 기다리지 않음)
    handleAITurn(aiTurnRequest)
      .then(result => {
        if (result.success) {
          console.log(`AI turn completed for ${playerLabel} in game ${gameId}`)
          
          // AI 턴 처리 결과에 따른 액션 실행
          executeAITurnActions(gameId, playerLabel, result)
        } else {
          console.error(`AI turn failed for ${playerLabel} in game ${gameId}:`, result.error)
        }
      })
      .catch(error => {
        console.error(`AI turn error for ${playerLabel} in game ${gameId}:`, error)
      })

  } catch (error) {
    console.error('Trigger AI turn error:', error)
  }
}

/**
 * AI 턴 처리 결과에 따른 액션 실행
 */
async function executeAITurnActions(
  gameId: string, 
  playerLabel: PlayerLabel, 
  result: any
): Promise<void> {
  try {
    const supabase = createServerClient()

    // 투표 결정인 경우
    if (result.voteDecision?.shouldVote) {
      console.log(`AI ${playerLabel} decided to vote: ${result.voteDecision.reason}`)
      
      // AI 투표 처리
      await handleAIVote(gameId, playerLabel, result.voteDecision)
    }
    
    // 메시지 생성인 경우
    if (result.messageGeneration?.message) {
      console.log(`AI ${playerLabel} generated message: ${result.messageGeneration.message}`)
      
      // 메시지 전송
      await supabase
        .from('messages')
        .insert({
          id: generateId(),
          game_id: gameId,
          player_label: playerLabel,
          content: result.messageGeneration.message,
          timestamp: new Date().toISOString(),
          is_system_message: false
        })

      // 메시지 전송 후 턴 자동 변경
      await handleMessageSent(gameId, playerLabel)
    }
    
    // 스킵인 경우
    if (result.messageGeneration?.shouldSkip) {
      console.log(`AI ${playerLabel} decided to skip: ${result.messageGeneration.reason}`)
      
      // 스킵 메시지 추가
      await addSkippedMessage(gameId, playerLabel)
      
      // 스킵 후 턴 자동 변경
      const { data: players } = await supabase
        .from('players')
        .select('player_label')
        .eq('game_id', gameId)
        .eq('status', 'active')

      if (players) {
        const activePlayers = players.map(p => p.player_label as PlayerLabel)
        const nextPlayer = getNextPlayer(playerLabel, activePlayers)

        await changeTurn({
          gameId,
          nextPlayerLabel: nextPlayer,
          reason: 'auto_skip'
        })
      }
    }

  } catch (error) {
    console.error('Execute AI turn actions error:', error)
  }
}

/**
 * AI 투표 처리
 */
async function handleAIVote(
  gameId: string, 
  playerLabel: PlayerLabel, 
  voteDecision: any
): Promise<void> {
  try {
    const supabase = createServerClient()

    // 게임 정보 조회
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('game_type, total_players')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Failed to get game info for AI vote:', gameError)
      return
    }

    // AI 투표 결정 (1:1 게임에서는 AI/Human, 1:N 게임에서는 2명의 AI 선택)
    let selectedPlayers: string[] = []

    if (game.game_type === '1v1') {
      // 1:1 게임에서는 상대방을 AI로 추정
      const { data: players } = await supabase
        .from('players')
        .select('player_label, is_ai')
        .eq('game_id', gameId)
        .eq('status', 'active')

      if (players) {
        const otherPlayer = players.find(p => p.player_label !== playerLabel)
        if (otherPlayer) {
          selectedPlayers = [otherPlayer.player_label]
        }
      }
    } else {
      // 1:N 게임에서는 AI 플레이어 2명 선택
      const { data: players } = await supabase
        .from('players')
        .select('player_label, is_ai')
        .eq('game_id', gameId)
        .eq('status', 'active')
        .eq('is_ai', true)

      if (players && players.length >= 2) {
        // AI 플레이어 중 2명을 랜덤하게 선택
        const shuffled = players.sort(() => 0.5 - Math.random())
        selectedPlayers = shuffled.slice(0, 2).map(p => p.player_label)
      }
    }

    if (selectedPlayers.length === 0) {
      console.error('No players selected for AI vote')
      return
    }

    // 투표 저장
    await supabase
      .from('votes')
      .insert({
        id: generateId(),
        game_id: gameId,
        player_label: playerLabel,
        selected_players: selectedPlayers,
        timestamp: new Date().toISOString(),
        is_ai_vote: true,
        vote_reason: voteDecision.reason || 'AI 결정'
      })

    console.log(`AI ${playerLabel} voted for: ${selectedPlayers.join(', ')}`)

    // 투표 후 게임 상태 확인
    const { data: votes } = await supabase
      .from('votes')
      .select('player_label')
      .eq('game_id', gameId)

    const voteCount = votes?.length || 0

    // 모든 플레이어가 투표했는지 확인
    if (voteCount >= game.total_players) {
      console.log('All players have voted, ending game')
      
      // 게임 상태를 'finished'로 변경
      await supabase
        .from('games')
        .update({
          status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
    }

  } catch (error) {
    console.error('Handle AI vote error:', error)
  }
}

/**
 * AI 턴 처리 테스트 (개발용)
 */
export async function testAITurnTrigger(gameId: string, playerLabel: PlayerLabel): Promise<void> {
  console.log(`Testing AI turn trigger for ${playerLabel} in game ${gameId}`)
  await triggerAITurnIfNeeded(gameId, playerLabel)
}
