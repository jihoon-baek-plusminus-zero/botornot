import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MessageWithPlayer {
  id: string
  content: string
  created_at: string
  players: {
    id: string
    player_label: string
    player_color: string
    is_ai: boolean
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    console.log('Game status request:', { gameId, sessionId })

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 1. 게임 정보 조회
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Game not found:', { gameId, gameError })
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    console.log('Game found:', { gameId: game.id, status: game.status })

    // 2. 플레이어 정보 조회
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })

    if (playersError || !players) {
      console.error('Failed to fetch players:', { gameId, playersError })
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      )
    }

    console.log('Players found:', players.map(p => ({ 
      id: p.id, 
      session_id: p.session_id, 
      player_label: p.player_label,
      is_ai: p.is_ai 
    })))

    // 3. 현재 플레이어 찾기
    const currentPlayer = players.find(p => p.session_id === sessionId)
    if (!currentPlayer) {
      console.error('Player not found:', { 
        sessionId, 
        availableSessionIds: players.map(p => p.session_id),
        players: players.map(p => ({ id: p.id, session_id: p.session_id, player_label: p.player_label }))
      })
      
      // 게임이 이미 진행 중인지 확인
      if (game.status === 'active' && players.length >= 2) {
        console.log('Game is already in progress with 2 players')
        return NextResponse.json(
          { error: '이 게임은 이미 진행 중입니다. 새로운 게임을 시작해주세요.' },
          { status: 403 }
        )
      }
      
      // 게임에 참여할 수 있는지 확인 (빈 자리가 있는지)
      const availableSlots = 2 - players.length
      if (availableSlots > 0) {
        // 게임에 참여 시도
        try {
          const { data: newPlayer, error: joinError } = await supabase
            .from('players')
            .insert({
              game_id: gameId,
              session_id: sessionId,
              player_label: `Player ${players.length + 1}`,
              player_color: players.length === 0 ? '#3B82F6' : '#EF4444',
              is_ai: false,
              turn_order: players.length + 1
            })
            .select()
            .single()

          if (joinError) {
            console.error('Failed to join game:', joinError)
            return NextResponse.json(
              { error: '게임 참여에 실패했습니다.' },
              { status: 500 }
            )
          }

          console.log('Player joined game:', { playerId: newPlayer.id, sessionId })
          
          // 새로 참여한 플레이어 정보로 응답
          const updatedPlayers = [...players, newPlayer]
          const response = {
            game: {
              id: game.id,
              status: game.status,
              topic: game.topic,
              expiresAt: game.expires_at,
              createdAt: game.created_at
            },
            players: updatedPlayers.map(p => ({
              id: p.id,
              label: p.player_label,
              color: p.player_color,
              isAi: p.is_ai,
              turnOrder: p.turn_order,
              status: p.status,
              isCurrentPlayer: p.session_id === sessionId
            })),
            messages: [],
            currentPlayer: {
              id: newPlayer.id,
              label: newPlayer.player_label,
              color: newPlayer.player_color,
              isAi: newPlayer.is_ai,
              turnOrder: newPlayer.turn_order
            }
          }

          return NextResponse.json(response)
        } catch (error) {
          console.error('Error joining game:', error)
          return NextResponse.json(
            { error: '게임 참여 중 오류가 발생했습니다.' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: '이 게임은 이미 가득 찼습니다. 새로운 게임을 시작해주세요.' },
          { status: 403 }
        )
      }
    }

    console.log('Current player found:', { 
      playerId: currentPlayer.id, 
      sessionId: currentPlayer.session_id,
      playerLabel: currentPlayer.player_label 
    })

    // 4. 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        players!inner(
          id,
          player_label,
          player_color,
          is_ai
        )
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Failed to fetch messages:', { gameId, messagesError })
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // 5. 응답 데이터 구성
    const response = {
      game: {
        id: game.id,
        status: game.status,
        topic: game.topic,
        expiresAt: game.expires_at,
        createdAt: game.created_at
      },
      players: players.map(p => ({
        id: p.id,
        label: p.player_label,
        color: p.player_color,
        isAi: p.is_ai,
        turnOrder: p.turn_order,
        status: p.status,
        isCurrentPlayer: p.session_id === sessionId
      })),
      messages: (messages as unknown as MessageWithPlayer[])?.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.created_at,
        player: {
          id: m.players.id,
          label: m.players.player_label,
          color: m.players.player_color,
          isAi: m.players.is_ai
        }
      })) || [],
      currentPlayer: {
        id: currentPlayer.id,
        label: currentPlayer.player_label,
        color: currentPlayer.player_color,
        isAi: currentPlayer.is_ai,
        turnOrder: currentPlayer.turn_order
      }
    }

    console.log('Game status response sent successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Game status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
