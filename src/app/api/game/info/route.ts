import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { GetGameInfoResponse } from '@/types/game-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json<GetGameInfoResponse>({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 정보 조회
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        id,
        type,
        status,
        topic_id,
        time_remaining,
        turn_time_remaining,
        current_turn,
        created_at
      `)
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<GetGameInfoResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 플레이어 정보 조회
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        player_label,
        is_ai,
        status,
        ai_persona_id
      `)
      .eq('game_id', gameId)
      .order('player_label')

    if (playersError) {
      console.error('Failed to get players:', playersError)
      return NextResponse.json<GetGameInfoResponse>({
        success: false,
        error: '플레이어 정보 조회에 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json<GetGameInfoResponse>({
      success: true,
      game: {
        id: game.id,
        type: game.type,
        status: game.status,
        topicId: game.topic_id,
        timeRemaining: game.time_remaining,
        turnTimeRemaining: game.turn_time_remaining,
        currentTurn: game.current_turn,
        createdAt: game.created_at
      },
      players: players?.map(player => ({
        label: player.player_label,
        isAI: player.is_ai,
        status: player.status,
        aiPersonaId: player.ai_persona_id
      })) || []
    })

  } catch (error) {
    console.error('Get game info error:', error)
    
    return NextResponse.json<GetGameInfoResponse>({
      success: false,
      error: error instanceof Error ? error.message : '게임 정보 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
