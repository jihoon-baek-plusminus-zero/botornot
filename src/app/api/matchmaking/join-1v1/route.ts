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

    // 1. 플레이어를 대기열에 추가
    const { error: queueError } = await supabase
      .from('matchmaking_queue_1v1')
      .insert({
        session_id: sessionId,
        status: 'waiting'
      })

    if (queueError) {
      console.error('Queue insertion error:', queueError)
      return NextResponse.json(
        { error: 'Failed to join queue' },
        { status: 500 }
      )
    }

    // 2. 매칭 로직 실행
    const matchResult = await processMatchmaking()

    if (matchResult) {
      return NextResponse.json({
        message: 'Match found!',
        gameId: matchResult.gameId,
        sessionId: matchResult.sessionId, // 게임에 참여한 세션 ID 반환
        isMatched: true
      })
    } else {
      return NextResponse.json({
        message: 'Waiting for match...',
        isMatched: false
      })
    }

  } catch (error) {
    console.error('Matchmaking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processMatchmaking() {
  // 1. 대기 중인 플레이어들을 시간순으로 가져오기
  const { data: waitingPlayers, error: fetchError } = await supabase
    .from('matchmaking_queue_1v1')
    .select('*')
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true })

  if (fetchError || !waitingPlayers) {
    console.error('Error fetching waiting players:', fetchError)
    return null
  }

  // 2. 시스템 설정 가져오기
  const { data: config } = await supabase
    .from('system_config')
    .select('*')
    .in('key', ['last_match_type', 'match_counter'])

  const lastMatchType = config?.find(c => c.key === 'last_match_type')?.value || 'ai'
  const matchCounter = parseInt(config?.find(c => c.key === 'match_counter')?.value || '0')

  // 3. 매칭 로직
  if (waitingPlayers.length >= 2) {
    // 사람-사람 매칭 (1,2번째 플레이어)
    const player1 = waitingPlayers[0]
    const player2 = waitingPlayers[1]

    // 게임 생성
    const gameId = await createGame('1v1', [
      { sessionId: player1.session_id, isAi: false, turnOrder: 1 },
      { sessionId: player2.session_id, isAi: false, turnOrder: 2 }
    ])

    // 매칭 상태 업데이트
    await supabase
      .from('matchmaking_queue_1v1')
      .update({ status: 'matched', game_id: gameId })
      .in('id', [player1.id, player2.id])

    // 시스템 설정 업데이트
    await supabase
      .from('system_config')
      .upsert([
        { key: 'last_match_type', value: 'human' },
        { key: 'match_counter', value: (matchCounter + 1).toString() }
      ])

    // 게임에 참여한 플레이어의 세션 ID 조회
    const { data: players } = await supabase
      .from('players')
      .select('session_id')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })

    const playerSessionId = players?.[0]?.session_id || player1.session_id
    
    return { gameId, sessionId: playerSessionId, type: 'human-human' }
  } else if (waitingPlayers.length >= 1 && lastMatchType === 'human') {
    // 사람-AI 매칭 (3번째 플레이어)
    const player = waitingPlayers[0]

    // 게임 생성 (AI와 매칭)
    const gameId = await createGame('1v1', [
      { sessionId: player.session_id, isAi: false, turnOrder: 1 },
      { sessionId: null, isAi: true, turnOrder: 2 }
    ])

    // 매칭 상태 업데이트
    await supabase
      .from('matchmaking_queue_1v1')
      .update({ status: 'matched', game_id: gameId })
      .eq('id', player.id)

    // 시스템 설정 업데이트
    await supabase
      .from('system_config')
      .upsert([
        { key: 'last_match_type', value: 'ai' },
        { key: 'match_counter', value: (matchCounter + 1).toString() }
      ])

    // 게임에 참여한 플레이어의 세션 ID 조회
    const { data: players } = await supabase
      .from('players')
      .select('session_id')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })

    const playerSessionId = players?.[0]?.session_id || player.session_id
    
    return { gameId, sessionId: playerSessionId, type: 'human-ai' }
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
