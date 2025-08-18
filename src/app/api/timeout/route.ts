import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, gameId, timeoutType, timeoutData } = body

    if (!action || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, gameId' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    switch (action) {
      case 'handle-timeout':
        // 타임아웃 이벤트 처리
        if (!timeoutType) {
          return NextResponse.json(
            { error: 'Missing timeoutType for handle-timeout action' },
            { status: 400 }
          )
        }

        // 게임 상태 업데이트
        const gameUpdate = await supabase
          .from('games')
          .update({ 
            status: timeoutType === 'game' ? 'finished' : 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (gameUpdate.error) {
          return NextResponse.json(
            { error: 'Failed to update game status', details: gameUpdate.error },
            { status: 500 }
          )
        }

        // 타임아웃 로그 추가
        const timeoutLog = await supabase
          .from('turn_logs')
          .insert({
            game_id: gameId,
            event_type: 'timeout',
            event_data: {
              timeout_type: timeoutType,
              timestamp: new Date().toISOString(),
              ...timeoutData
            }
          })

        if (timeoutLog.error) {
          console.error('Failed to log timeout:', timeoutLog.error)
        }

        return NextResponse.json({ 
          success: true, 
          message: `${timeoutType} timeout handled`,
          gameStatus: timeoutType === 'game' ? 'finished' : 'active'
        })

      case 'start-game-timeout':
        // 게임 전체 타임아웃 시작
        const gameTimeout = await supabase
          .from('games')
          .update({ 
            time_remaining: timeoutData?.duration || 120,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (gameTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to start game timeout', details: gameTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Game timeout started' })

      case 'stop-game-timeout':
        // 게임 타임아웃 중지
        const stopGameTimeout = await supabase
          .from('games')
          .update({ 
            time_remaining: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (stopGameTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to stop game timeout', details: stopGameTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Game timeout stopped' })

      case 'start-turn-timeout':
        // 턴 타임아웃 시작
        const turnTimeout = await supabase
          .from('games')
          .update({ 
            turn_time_remaining: timeoutData?.duration || 10,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (turnTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to start turn timeout', details: turnTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Turn timeout started' })

      case 'stop-turn-timeout':
        // 턴 타임아웃 중지
        const stopTurnTimeout = await supabase
          .from('games')
          .update({ 
            turn_time_remaining: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (stopTurnTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to stop turn timeout', details: stopTurnTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Turn timeout stopped' })

      case 'start-vote-timeout':
        // 투표 타임아웃 시작
        const voteTimeout = await supabase
          .from('games')
          .update({ 
            vote_time_remaining: timeoutData?.duration || 10,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (voteTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to start vote timeout', details: voteTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Vote timeout started' })

      case 'stop-vote-timeout':
        // 투표 타임아웃 중지
        const stopVoteTimeout = await supabase
          .from('games')
          .update({ 
            vote_time_remaining: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (stopVoteTimeout.error) {
          return NextResponse.json(
            { error: 'Failed to stop vote timeout', details: stopVoteTimeout.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Vote timeout stopped' })

      case 'cleanup-game':
        // 게임 정리
        const cleanupResult = await supabase
          .from('games')
          .update({ 
            status: 'finished',
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (cleanupResult.error) {
          return NextResponse.json(
            { error: 'Failed to cleanup game', details: cleanupResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, message: 'Game cleaned up' })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Timeout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      // 타임아웃 통계 조회
      return NextResponse.json({
        success: true,
        stats: {
          total_timeouts: 0,
          game_timeouts: 0,
          turn_timeouts: 0,
          vote_timeouts: 0
        }
      })
    } else if (action === 'reset-stats') {
      // 타임아웃 통계 초기화
      return NextResponse.json({ success: true, message: 'Timeout stats reset' })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: stats, reset-stats' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Timeout stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
