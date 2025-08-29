import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 1. 대기열에서 해당 세션 찾기
    const { data: queueEntry, error: queueError } = await supabase
      .from('matchmaking_queue_1v1')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'matched')
      .single()

    if (queueError) {
      // 매칭되지 않았거나 찾을 수 없음
      return NextResponse.json({
        isMatched: false,
        message: 'Still waiting for match...'
      })
    }

    if (!queueEntry) {
      return NextResponse.json({
        isMatched: false,
        message: 'Still waiting for match...'
      })
    }

    // 2. 매칭된 게임 찾기
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', queueEntry.game_id)
      .eq('status', 'active')
      .single()

    if (gameError || !game) {
      return NextResponse.json({
        isMatched: false,
        message: 'Game not found'
      })
    }

    // 3. 플레이어 정보 확인
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', game.id)
      .eq('session_id', sessionId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({
        isMatched: false,
        message: 'Player not found in game'
      })
    }

    return NextResponse.json({
      isMatched: true,
      gameId: game.id,
      message: 'Match found!'
    })

  } catch (error) {
    console.error('Check status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
