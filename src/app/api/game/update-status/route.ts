import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UpdateGameStatusRequest, UpdateGameStatusResponse } from '@/types/game-api'
import { GameStatus, PlayerLabel } from '@/types/game'
import { broadcastGameStatusChange } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const body: UpdateGameStatusRequest = await request.json()
    const { gameId, status, timeRemaining, turnTimeRemaining, currentTurn } = body

    // 입력 검증
    if (!gameId || !status) {
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: 'gameId와 status는 필수입니다.'
      }, { status: 400 })
    }

    if (!['waiting', 'active', 'voting', 'finished'].includes(status)) {
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: '유효하지 않은 게임 상태입니다.'
      }, { status: 400 })
    }

    if (currentTurn && !['A', 'B', 'C', 'D', 'E'].includes(currentTurn)) {
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: '유효하지 않은 currentTurn입니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 상태 변경 유효성 검사
    if (!isValidStatusTransition(game.status as GameStatus, status as GameStatus)) {
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: `게임 상태를 ${game.status}에서 ${status}로 변경할 수 없습니다.`
      }, { status: 400 })
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      status: status as GameStatus,
      updated_at: new Date().toISOString()
    }

    if (timeRemaining !== undefined) {
      updateData.time_remaining = timeRemaining
    }

    if (turnTimeRemaining !== undefined) {
      updateData.turn_time_remaining = turnTimeRemaining
    }

    if (currentTurn !== undefined) {
      updateData.current_turn = currentTurn
    }

    // 게임 상태 업데이트
    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)

    if (updateError) {
      console.error('Failed to update game status:', updateError)
      return NextResponse.json<UpdateGameStatusResponse>({
        success: false,
        error: '게임 상태 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    // 상태 변경에 따른 추가 처리
    if (status === 'active' && game.status !== 'active') {
      // 게임 시작 시 시스템 메시지 추가
      await addSystemMessage(gameId, '게임이 시작되었습니다! 주제에 대해 대화를 나누어보세요.')
    } else if (status === 'voting' && game.status !== 'voting') {
      // 투표 시작 시 시스템 메시지 추가
      await addSystemMessage(gameId, '투표 시간입니다! AI로 의심되는 플레이어를 선택하세요.')
    } else if (status === 'finished' && game.status !== 'finished') {
      // 게임 종료 시 시스템 메시지 추가
      await addSystemMessage(gameId, '게임이 종료되었습니다. 결과를 확인하세요.')
    }

    // 실시간 브로드캐스트
    try {
      await broadcastGameStatusChange(gameId, {
        status: status as GameStatus,
        timeRemaining: timeRemaining || 0,
        turnTimeRemaining: turnTimeRemaining || 0,
        currentTurn: currentTurn || null
      })
    } catch (broadcastError) {
      console.error('Failed to broadcast game status change:', broadcastError)
      // 브로드캐스트 실패는 상태 변경 실패로 처리하지 않음
    }

    return NextResponse.json<UpdateGameStatusResponse>({
      success: true
    })

  } catch (error) {
    console.error('Update game status error:', error)
    
    return NextResponse.json<UpdateGameStatusResponse>({
      success: false,
      error: error instanceof Error ? error.message : '게임 상태 업데이트 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 상태 전환 유효성 검사
function isValidStatusTransition(currentStatus: GameStatus, newStatus: GameStatus): boolean {
  const validTransitions: Record<GameStatus, GameStatus[]> = {
    waiting: ['active', 'finished'],
    active: ['voting', 'finished'],
    voting: ['finished'],
    finished: [] // finished는 최종 상태
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}

// 시스템 메시지 추가
async function addSystemMessage(gameId: string, content: string) {
  const supabase = createServerClient()
  const { generateId } = await import('@/lib/utils')

  try {
    await supabase
      .from('messages')
      .insert({
        id: generateId(),
        game_id: gameId,
        player_label: null,
        content,
        timestamp: new Date().toISOString(),
        is_system_message: true
      })
  } catch (error) {
    console.error('Failed to add system message:', error)
  }
}
