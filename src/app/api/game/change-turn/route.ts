import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { ChangeTurnRequest, ChangeTurnResponse } from '@/types/game-api'
import { PlayerLabel } from '@/types/game'
import { broadcastTurnChange } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const body: ChangeTurnRequest = await request.json()
    const { gameId, nextPlayerLabel, turnTimeRemaining = 10 } = body

    // 입력 검증
    if (!gameId || !nextPlayerLabel) {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: 'gameId와 nextPlayerLabel은 필수입니다.'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(nextPlayerLabel)) {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '유효하지 않은 nextPlayerLabel입니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, current_turn')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 게임이 활성 상태인지 확인
    if (game.status !== 'active') {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '게임이 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 다음 플레이어가 존재하는지 확인
    const { data: nextPlayer, error: playerError } = await supabase
      .from('players')
      .select('player_label, status')
      .eq('game_id', gameId)
      .eq('player_label', nextPlayerLabel)
      .single()

    if (playerError || !nextPlayer) {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '다음 플레이어를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (nextPlayer.status !== 'active') {
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '다음 플레이어가 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 턴 변경
    const { error: updateError } = await supabase
      .from('games')
      .update({
        current_turn: nextPlayerLabel,
        turn_time_remaining: turnTimeRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (updateError) {
      console.error('Failed to change turn:', updateError)
      return NextResponse.json<ChangeTurnResponse>({
        success: false,
        error: '턴 변경에 실패했습니다.'
      }, { status: 500 })
    }

    // 실시간 브로드캐스트
    try {
      await broadcastTurnChange(gameId, {
        currentTurn: nextPlayerLabel as PlayerLabel,
        turnTimeRemaining,
        previousTurn: game.current_turn as PlayerLabel
      })
    } catch (broadcastError) {
      console.error('Failed to broadcast turn change:', broadcastError)
      // 브로드캐스트 실패는 턴 변경 실패로 처리하지 않음
    }

    return NextResponse.json<ChangeTurnResponse>({
      success: true
    })

  } catch (error) {
    console.error('Change turn error:', error)
    
    return NextResponse.json<ChangeTurnResponse>({
      success: false,
      error: error instanceof Error ? error.message : '턴 변경 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
