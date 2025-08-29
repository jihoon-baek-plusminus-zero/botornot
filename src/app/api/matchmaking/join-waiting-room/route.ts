import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, gameType = '1v1' } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 1. 플레이어를 대기방에 추가
    const { data: waitingPlayer, error: queueError } = await supabase
      .from('waiting_room')
      .insert({
        session_id: sessionId,
        game_type: gameType,
        status: 'waiting',
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (queueError) {
      console.error('Waiting room insertion error:', queueError)
      return NextResponse.json(
        { error: 'Failed to join waiting room' },
        { status: 500 }
      )
    }

    console.log('Player joined waiting room:', { 
      playerId: waitingPlayer.id, 
      sessionId: waitingPlayer.session_id,
      gameType: waitingPlayer.game_type 
    })

    // 2. 매칭 로직 실행
    const matchResult = await processMatchmaking(gameType)

    if (matchResult) {
      // 매칭 완료 - 대기방에서 제거
      await supabase
        .from('waiting_room')
        .delete()
        .eq('session_id', sessionId)

      return NextResponse.json({
        message: 'Match found!',
        gameId: matchResult.gameId,
        sessionId: matchResult.sessionId,
        isMatched: true,
        matchType: matchResult.matchType
      })
    } else {
      // 매칭 대기 중
      return NextResponse.json({
        message: 'Waiting for match...',
        isMatched: false,
        waitingRoomId: waitingPlayer.id
      })
    }

  } catch (error) {
    console.error('Waiting room error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processMatchmaking(gameType: string) {
  // 1. 대기 중인 플레이어들을 시간순으로 가져오기
  const { data: waitingPlayers, error: fetchError } = await supabase
    .from('waiting_room')
    .select('*')
    .eq('status', 'waiting')
    .eq('game_type', gameType)
    .order('joined_at', { ascending: true })

  if (fetchError || !waitingPlayers) {
    console.error('Error fetching waiting players:', fetchError)
    return null
  }

  console.log('Waiting players:', waitingPlayers.length)

  // 2. 매칭 카운터 가져오기
  const { data: config } = await supabase
    .from('system_config')
    .select('*')
    .eq('key', 'match_counter')

  const matchCounter = parseInt(config?.[0]?.value || '0')

  // 3. 새로운 매칭 로직: AI-사람-사람-AI-사람-사람 패턴
  if (waitingPlayers.length >= 1) {
    const currentPlayer = waitingPlayers[0]
    
    // 매칭 카운터가 짝수면 AI와 매칭, 홀수면 사람과 매칭
    const shouldMatchWithAI = matchCounter % 2 === 0

    if (shouldMatchWithAI) {
      // AI와 매칭
      console.log('Matching with AI:', currentPlayer.session_id)
      
      const gameId = await createGame(gameType, [
        { sessionId: currentPlayer.session_id, isAi: false, turnOrder: 1 },
        { sessionId: null, isAi: true, turnOrder: 2 }
      ])

      // 매칭 상태 업데이트
      await supabase
        .from('waiting_room')
        .update({ status: 'matched', game_id: gameId })
        .eq('id', currentPlayer.id)

      // 매칭 카운터 증가
      await supabase
        .from('system_config')
        .upsert({ key: 'match_counter', value: (matchCounter + 1).toString() })

      return { 
        gameId, 
        sessionId: currentPlayer.session_id, 
        matchType: 'human-ai' 
      }
    } else {
      // 사람과 매칭 (대기열에 다른 사람이 있는 경우)
      if (waitingPlayers.length >= 2) {
        const player1 = waitingPlayers[0]
        const player2 = waitingPlayers[1]

        console.log('Matching humans:', player1.session_id, player2.session_id)

        const gameId = await createGame(gameType, [
          { sessionId: player1.session_id, isAi: false, turnOrder: 1 },
          { sessionId: player2.session_id, isAi: false, turnOrder: 2 }
        ])

        // 두 플레이어 모두 매칭 상태로 업데이트
        await supabase
          .from('waiting_room')
          .update({ status: 'matched', game_id: gameId })
          .in('id', [player1.id, player2.id])

        // 매칭 카운터 증가
        await supabase
          .from('system_config')
          .upsert({ key: 'match_counter', value: (matchCounter + 1).toString() })

        return { 
          gameId, 
          sessionId: player1.session_id, 
          matchType: 'human-human' 
        }
      } else {
        // 다른 사람을 기다려야 함
        return null
      }
    }
  }

  return null
}

async function createGame(gameType: string, players: Array<{ sessionId: string | null, isAi: boolean, turnOrder: number }>) {
  console.log('Creating game with players:', players)
  
  // 1. 게임 생성
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      game_type: gameType,
      status: 'active',
      expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2분 후 만료
    })
    .select()
    .single()

  if (gameError) {
    console.error('Game creation error:', gameError)
    throw gameError
  }

  console.log('Game created:', { gameId: game.id, gameType })

  // 2. 플레이어 생성
  const playerColors = ['#3B82F6', '#EF4444'] // 파란색, 빨간색
  const playerLabels = ['Player 1', 'Player 2']

  for (let i = 0; i < players.length; i++) {
    const player = players[i]
    console.log('Creating player:', { 
      gameId: game.id, 
      sessionId: player.sessionId, 
      playerLabel: playerLabels[i],
      isAi: player.isAi,
      turnOrder: player.turnOrder 
    })
    
    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        session_id: player.sessionId,
        player_label: playerLabels[i],
        player_color: playerColors[i],
        is_ai: player.isAi,
        turn_order: player.turnOrder
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player creation error:', playerError)
      throw playerError
    }

    console.log('Player created:', { 
      playerId: newPlayer.id, 
      sessionId: newPlayer.session_id,
      playerLabel: newPlayer.player_label 
    })
  }

  return game.id
}
