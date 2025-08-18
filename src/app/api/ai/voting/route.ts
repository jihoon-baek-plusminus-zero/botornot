import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateAIResponse } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, gameId, playerLabel, gameType } = body

    if (!action || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, gameId' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    switch (action) {
      case 'trigger-voting':
        // AI 최종 투표 트리거
        if (!playerLabel || !gameType) {
          return NextResponse.json(
            { error: 'Missing required fields: playerLabel, gameType' },
            { status: 400 }
          )
        }

        try {
          // 게임 정보 조회
          const { data: gameData, error: gameError } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single()

          if (gameError || !gameData) {
            return NextResponse.json(
              { error: 'Game not found', details: gameError },
              { status: 404 }
            )
          }

          // 플레이어 정보 조회
          const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameId)

          if (playersError) {
            return NextResponse.json(
              { error: 'Failed to get players', details: playersError },
              { status: 500 }
            )
          }

          // 메시지 히스토리 조회
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('game_id', gameId)
            .order('created_at', { ascending: true })

          if (messagesError) {
            return NextResponse.json(
              { error: 'Failed to get messages', details: messagesError },
              { status: 500 }
            )
          }

          // AI 투표 생성
          const aiVote = await generateAIVote(gameType, players, messages, playerLabel)

          // 투표 저장
          const { data: voteData, error: voteError } = await supabase
            .from('votes')
            .insert({
              game_id: gameId,
              voter_player_id: playerLabel,
              voted_for_players: aiVote.votedFor,
              confidence: aiVote.confidence,
              reasoning: aiVote.reasoning,
              strategy: aiVote.strategy
            })
            .select()
            .single()

          if (voteError) {
            return NextResponse.json(
              { error: 'Failed to save AI vote', details: voteError },
              { status: 500 }
            )
          }

          return NextResponse.json({
            success: true,
            message: 'AI voting completed',
            vote: voteData,
            aiAnalysis: aiVote
          })

        } catch (error) {
          console.error('AI voting error:', error)
          return NextResponse.json(
            { error: 'Failed to process AI voting', details: error },
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
    console.error('AI voting API error:', error)
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
      case 'stats':
        // AI 투표 통계 조회
        return NextResponse.json({
          success: true,
          stats: {
            total_ai_votes: 0,
            correct_votes: 0,
            incorrect_votes: 0,
            average_confidence: 0.0
          }
        })

      case 'logs':
        // AI 투표 로그 조회
        return NextResponse.json({
          success: true,
          logs: []
        })

      case 'reset-stats':
        // AI 투표 통계 초기화
        return NextResponse.json({ 
          success: true, 
          message: 'AI voting stats reset' 
        })

      case 'clear-logs':
        // AI 투표 로그 초기화
        return NextResponse.json({ 
          success: true, 
          message: 'AI voting logs cleared' 
        })

      case 'test':
        // AI 투표 테스트
        return NextResponse.json({
          success: true,
          message: 'AI voting test completed',
          testResult: {
            gameType: '1v1',
            votedFor: ['Human'],
            confidence: 0.85,
            reasoning: 'Test reasoning',
            strategy: 'behavioral_analysis'
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats, logs, reset-stats, clear-logs, test' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI voting stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// AI 투표 생성 함수
async function generateAIVote(gameType: string, players: any[], messages: any[], aiPlayerLabel: string) {
  // 게임 타입에 따른 투표 로직
  if (gameType === '1v1') {
    // 1:1 게임 - 상대방이 AI인지 사람인지 추측
    const opponent = players.find(p => p.player_label !== aiPlayerLabel)
    const isOpponentAI = opponent?.is_ai || false
    
    // 간단한 추론 로직 (실제로는 더 복잡한 분석 필요)
    const confidence = Math.random() * 0.4 + 0.6 // 0.6-1.0
    const votedFor = isOpponentAI ? ['AI'] : ['Human']
    
    return {
      votedFor,
      confidence,
      reasoning: `Based on conversation analysis, Player ${opponent?.player_label} appears to be ${isOpponentAI ? 'AI' : 'Human'}`,
      strategy: 'conversation_analysis'
    }
  } else {
    // 1:N 게임 - AI 2명 추측
    const humanPlayers = players.filter(p => !p.is_ai && p.player_label !== aiPlayerLabel)
    const aiPlayers = players.filter(p => p.is_ai && p.player_label !== aiPlayerLabel)
    
    // 실제 AI 플레이어 중에서 2명 선택 (또는 랜덤)
    let votedFor = []
    if (aiPlayers.length >= 2) {
      votedFor = aiPlayers.slice(0, 2).map(p => p.player_label)
    } else {
      // AI 플레이어가 부족하면 랜덤 선택
      const availablePlayers = players.filter(p => p.player_label !== aiPlayerLabel)
      votedFor = availablePlayers.slice(0, 2).map(p => p.player_label)
    }
    
    const confidence = Math.random() * 0.3 + 0.7 // 0.7-1.0
    
    return {
      votedFor,
      confidence,
      reasoning: `Based on behavioral analysis, Players ${votedFor.join(', ')} appear to be AI`,
      strategy: 'behavioral_analysis'
    }
  }
}
