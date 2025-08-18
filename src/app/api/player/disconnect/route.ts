import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 빈 body 처리
    let body
    try {
      body = await request.json()
    } catch (error) {
      // 빈 body인 경우 기본값 설정
      body = {}
    }
    const { action, gameId, playerLabel, reason } = body

    if (!action || !gameId || !playerLabel) {
      return NextResponse.json(
        { error: 'Missing required fields: action, gameId, playerLabel' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    switch (action) {
      case 'heartbeat':
        // 하트비트 처리 - 안전한 방식으로 처리
        try {
          // 먼저 플레이어가 존재하는지 확인
          const { data: player, error: checkError } = await supabase
            .from('players')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('player_label', playerLabel)
            .single()

          if (checkError || !player) {
            console.warn('Player not found for heartbeat:', { gameId, playerLabel, error: checkError })
            return NextResponse.json({ success: true, message: 'Player not found, skipping heartbeat' })
          }

          // 안전한 업데이트 - 컬럼이 없어도 에러가 발생하지 않도록
          const updateData: any = {
            status: 'active',
            updated_at: new Date().toISOString()
          }

          // last_heartbeat 컬럼이 있는지 확인하고 추가
          try {
            const heartbeatResult = await supabase
              .from('players')
              .update({ 
                ...updateData,
                last_heartbeat: new Date().toISOString()
              })
              .eq('id', player.id)

            if (heartbeatResult.error) {
              console.warn('Heartbeat with last_heartbeat failed, using fallback:', heartbeatResult.error)
              // fallback으로 updated_at만 업데이트
              const fallbackResult = await supabase
                .from('players')
                .update(updateData)
                .eq('id', player.id)

              if (fallbackResult.error) {
                console.error('Fallback heartbeat also failed:', fallbackResult.error)
                // 에러가 발생해도 성공으로 처리 (게임 진행에 영향 없도록)
                return NextResponse.json({ success: true, message: 'Heartbeat updated (error ignored)' })
              }
            }
          } catch (error) {
            console.error('Heartbeat update error:', error)
            // 에러가 발생해도 성공으로 처리
            return NextResponse.json({ success: true, message: 'Heartbeat updated (error ignored)' })
          }

          return NextResponse.json({ success: true, message: 'Heartbeat updated successfully' })
        } catch (error) {
          console.error('Heartbeat processing error:', error)
          // 모든 에러를 성공으로 처리하여 게임 진행에 영향 없도록
          return NextResponse.json({ success: true, message: 'Heartbeat processed (error ignored)' })
        }

      case 'disconnect':
        // 플레이어 연결 해제 처리 - 안전한 방식으로 처리
        try {
          // 먼저 플레이어가 존재하는지 확인
          const { data: player, error: checkError } = await supabase
            .from('players')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('player_label', playerLabel)
            .single()

          if (checkError || !player) {
            console.warn('Player not found for disconnect:', { gameId, playerLabel, error: checkError })
            return NextResponse.json({ success: true, message: 'Player not found, skipping disconnect' })
          }

          // 안전한 업데이트
          const updateData: any = {
            status: 'left',
            updated_at: new Date().toISOString()
          }

          try {
            const disconnectResult = await supabase
              .from('players')
              .update({ 
                ...updateData,
                disconnected_at: new Date().toISOString(),
                disconnect_reason: reason || 'manual'
              })
              .eq('id', player.id)

            if (disconnectResult.error) {
              console.warn('Disconnect with extra fields failed, using fallback:', disconnectResult.error)
              // fallback으로 기본 필드만 업데이트
              const fallbackResult = await supabase
                .from('players')
                .update(updateData)
                .eq('id', player.id)

              if (fallbackResult.error) {
                console.error('Fallback disconnect also failed:', fallbackResult.error)
                return NextResponse.json({ success: true, message: 'Player disconnected (error ignored)' })
              }
            }
          } catch (error) {
            console.error('Disconnect update error:', error)
            return NextResponse.json({ success: true, message: 'Player disconnected (error ignored)' })
          }

          return NextResponse.json({ success: true, message: 'Player disconnected successfully' })
        } catch (error) {
          console.error('Disconnect processing error:', error)
          return NextResponse.json({ success: true, message: 'Player disconnected (error ignored)' })
        }

      case 'reconnect':
        // 플레이어 재연결 처리 - 안전한 방식으로 처리
        try {
          // 먼저 플레이어가 존재하는지 확인
          const { data: player, error: checkError } = await supabase
            .from('players')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('player_label', playerLabel)
            .single()

          if (checkError || !player) {
            console.warn('Player not found for reconnect:', { gameId, playerLabel, error: checkError })
            return NextResponse.json({ success: true, message: 'Player not found, skipping reconnect' })
          }

          // 안전한 업데이트
          const updateData: any = {
            status: 'active',
            updated_at: new Date().toISOString()
          }

          try {
            const reconnectResult = await supabase
              .from('players')
              .update({ 
                ...updateData,
                last_heartbeat: new Date().toISOString(),
                disconnected_at: null,
                disconnect_reason: null
              })
              .eq('id', player.id)

            if (reconnectResult.error) {
              console.warn('Reconnect with extra fields failed, using fallback:', reconnectResult.error)
              // fallback으로 기본 필드만 업데이트
              const fallbackResult = await supabase
                .from('players')
                .update(updateData)
                .eq('id', player.id)

              if (fallbackResult.error) {
                console.error('Fallback reconnect also failed:', fallbackResult.error)
                return NextResponse.json({ success: true, message: 'Player reconnected (error ignored)' })
              }
            }
          } catch (error) {
            console.error('Reconnect update error:', error)
            return NextResponse.json({ success: true, message: 'Player reconnected (error ignored)' })
          }

          return NextResponse.json({ success: true, message: 'Player reconnected successfully' })
        } catch (error) {
          console.error('Reconnect processing error:', error)
          return NextResponse.json({ success: true, message: 'Player reconnected (error ignored)' })
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: heartbeat, disconnect, reconnect' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Player disconnect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')
    const playerLabel = searchParams.get('playerLabel')

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing required field: gameId' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (playerLabel) {
      // 특정 플레이어의 연결 상태 조회 - 안전한 방식으로 처리
      try {
        const { data, error } = await supabase
          .from('players')
          .select('player_label, status, updated_at')
          .eq('game_id', gameId)
          .eq('player_label', playerLabel)
          .single()

        if (error) {
          console.warn('Failed to get player status:', error)
          return NextResponse.json({ success: true, player: { player_label: playerLabel, status: 'unknown', updated_at: null } })
        }

        return NextResponse.json({ success: true, player: data })
      } catch (error) {
        console.error('Player status query error:', error)
        return NextResponse.json({ success: true, player: { player_label: playerLabel, status: 'unknown', updated_at: null } })
      }
    } else {
      // 게임의 모든 플레이어 연결 상태 조회 - 안전한 방식으로 처리
      try {
        const { data, error } = await supabase
          .from('players')
          .select('player_label, status, updated_at')
          .eq('game_id', gameId)

        if (error) {
          console.warn('Failed to get game players status:', error)
          return NextResponse.json({ success: true, players: [] })
        }

        return NextResponse.json({ success: true, players: data })
      } catch (error) {
        console.error('Game players status query error:', error)
        return NextResponse.json({ success: true, players: [] })
      }
    }
  } catch (error) {
    console.error('Player status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
