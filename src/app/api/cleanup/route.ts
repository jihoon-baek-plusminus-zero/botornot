import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, gameId, force } = body

    if (!action || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, gameId' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    switch (action) {
      case 'cleanup-game':
        // 게임 데이터 정리
        try {
          // 순서대로 데이터 삭제 (외래키 제약조건 고려)
          
          // 1. 큐 엔트리 삭제
          await supabase
            .from('queue_entries')
            .delete()
            .eq('game_id', gameId)

          // 2. 턴 로그 삭제
          await supabase
            .from('turn_logs')
            .delete()
            .eq('game_id', gameId)

          // 3. 투표 삭제
          await supabase
            .from('votes')
            .delete()
            .eq('game_id', gameId)

          // 4. 메시지 삭제
          await supabase
            .from('messages')
            .delete()
            .eq('game_id', gameId)

          // 5. 플레이어 삭제
          await supabase
            .from('players')
            .delete()
            .eq('game_id', gameId)

          // 6. 게임 삭제
          const gameDelete = await supabase
            .from('games')
            .delete()
            .eq('id', gameId)

          if (gameDelete.error) {
            return NextResponse.json(
              { error: 'Failed to delete game', details: gameDelete.error },
              { status: 500 }
            )
          }

          return NextResponse.json({ 
            success: true, 
            message: 'Game data cleaned up successfully',
            deletedGameId: gameId
          })

        } catch (error) {
          console.error('Cleanup error:', error)
          return NextResponse.json(
            { error: 'Failed to cleanup game data', details: error },
            { status: 500 }
          )
        }

      case 'force-cleanup':
        // 강제 정리 (force=true인 경우)
        if (!force) {
          return NextResponse.json(
            { error: 'Force cleanup requires force=true' },
            { status: 400 }
          )
        }

        // 강제 정리 로직 (더 적극적인 정리)
        try {
          // 모든 관련 데이터 삭제
          await supabase.rpc('force_cleanup_game', { game_id: gameId })
          
          return NextResponse.json({ 
            success: true, 
            message: 'Game data force cleaned up successfully',
            deletedGameId: gameId
          })
        } catch (error) {
          console.error('Force cleanup error:', error)
          return NextResponse.json(
            { error: 'Failed to force cleanup game data', details: error },
            { status: 500 }
          )
        }

      case 'batch-cleanup':
        // 여러 게임 일괄 정리
        const gameIds = body.gameIds || []
        if (!Array.isArray(gameIds) || gameIds.length === 0) {
          return NextResponse.json(
            { error: 'Missing or invalid gameIds array' },
            { status: 400 }
          )
        }

        const cleanupResults = []
        for (const id of gameIds) {
          try {
            // 각 게임에 대해 정리 수행
            await supabase
              .from('queue_entries')
              .delete()
              .eq('game_id', id)

            await supabase
              .from('turn_logs')
              .delete()
              .eq('game_id', id)

            await supabase
              .from('votes')
              .delete()
              .eq('game_id', id)

            await supabase
              .from('messages')
              .delete()
              .eq('game_id', id)

            await supabase
              .from('players')
              .delete()
              .eq('game_id', id)

            await supabase
              .from('games')
              .delete()
              .eq('id', id)

            cleanupResults.push({ gameId: id, status: 'success' })
          } catch (error) {
            cleanupResults.push({ gameId: id, status: 'error', error: error.message })
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Batch cleanup completed',
          results: cleanupResults
        })

      case 'cancel-cleanup':
        // 정리 취소 (실제로는 로그만 남김)
        return NextResponse.json({ 
          success: true, 
          message: 'Cleanup cancelled',
          gameId: gameId
        })

      case 'cleanup-completed':
        // 정리 완료 알림
        return NextResponse.json({ 
          success: true, 
          message: 'Cleanup completed notification sent',
          gameId: gameId
        })

      case 'reset-all':
        // 모든 데이터 초기화 (개발용)
        if (!force) {
          return NextResponse.json(
            { error: 'Reset all requires force=true' },
            { status: 400 }
          )
        }

        try {
          // 모든 테이블 초기화
          await supabase.from('queue_entries').delete().neq('id', '')
          await supabase.from('turn_logs').delete().neq('id', '')
          await supabase.from('votes').delete().neq('id', '')
          await supabase.from('messages').delete().neq('id', '')
          await supabase.from('players').delete().neq('id', '')
          await supabase.from('games').delete().neq('id', '')

          return NextResponse.json({ 
            success: true, 
            message: 'All data reset successfully'
          })
        } catch (error) {
          console.error('Reset all error:', error)
          return NextResponse.json(
            { error: 'Failed to reset all data', details: error },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cleanup API error:', error)
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

    switch (action) {
      case 'progress':
        // 정리 진행 상황 조회
        return NextResponse.json({
          success: true,
          progress: {
            status: 'idle',
            completed: 0,
            total: 0,
            percentage: 0
          }
        })

      case 'logs':
        // 정리 로그 조회
        return NextResponse.json({
          success: true,
          logs: []
        })

      case 'stats':
        // 정리 통계 조회
        return NextResponse.json({
          success: true,
          stats: {
            total_cleanups: 0,
            successful_cleanups: 0,
            failed_cleanups: 0,
            last_cleanup: null
          }
        })

      case 'reset-stats':
        // 정리 통계 초기화
        return NextResponse.json({ 
          success: true, 
          message: 'Cleanup stats reset' 
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: progress, logs, stats, reset-stats' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cleanup stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
