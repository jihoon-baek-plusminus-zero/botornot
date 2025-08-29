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

    // 대기방에서 플레이어 상태 확인
    const { data: waitingPlayer, error: fetchError } = await supabase
      .from('waiting_room')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (fetchError) {
      console.error('Error fetching waiting player:', fetchError)
      return NextResponse.json(
        { error: 'Player not found in waiting room' },
        { status: 404 }
      )
    }

    if (!waitingPlayer) {
      return NextResponse.json(
        { error: 'Player not found in waiting room' },
        { status: 404 }
      )
    }

    // 매칭이 완료되었는지 확인
    if (waitingPlayer.status === 'matched' && waitingPlayer.game_id) {
      return NextResponse.json({
        isMatched: true,
        gameId: waitingPlayer.game_id,
        sessionId: waitingPlayer.session_id,
        matchType: waitingPlayer.game_type === '1v1' ? 'human-ai' : 'human-human'
      })
    }

    // 대기 중인 경우 대기열 순서 정보 제공
    const { data: allWaitingPlayers } = await supabase
      .from('waiting_room')
      .select('*')
      .eq('status', 'waiting')
      .eq('game_type', waitingPlayer.game_type)
      .order('joined_at', { ascending: true })

    const position = allWaitingPlayers?.findIndex(p => p.session_id === sessionId) || 0
    const totalWaiting = allWaitingPlayers?.length || 0

    return NextResponse.json({
      isMatched: false,
      position: position + 1,
      totalWaiting,
      gameType: waitingPlayer.game_type,
      joinedAt: waitingPlayer.joined_at
    })

  } catch (error) {
    console.error('Check waiting room status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
