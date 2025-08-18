import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { GetGameStatsResponse } from '@/types/game-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json<GetGameStatsResponse>({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, created_at')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<GetGameStatsResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 메시지 수 조회
    const { count: totalMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)

    if (messagesError) {
      console.error('Failed to get message count:', messagesError)
    }

    // 투표 수 조회
    const { count: totalVotes, error: votesError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)

    if (votesError) {
      console.error('Failed to get vote count:', votesError)
    }

    // 평균 응답 시간 계산 (메시지 간격)
    const { data: messages, error: responseTimeError } = await supabase
      .from('messages')
      .select('timestamp')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })

    let averageResponseTime = 0
    if (!responseTimeError && messages && messages.length > 1) {
      let totalInterval = 0
      for (let i = 1; i < messages.length; i++) {
        const interval = new Date(messages[i].timestamp).getTime() - new Date(messages[i-1].timestamp).getTime()
        totalInterval += interval
      }
      averageResponseTime = totalInterval / (messages.length - 1) / 1000 // 초 단위로 변환
    }

    // 게임 지속 시간 계산
    const gameDuration = (Date.now() - new Date(game.created_at).getTime()) / 1000 // 초 단위

    return NextResponse.json<GetGameStatsResponse>({
      success: true,
      stats: {
        totalMessages: totalMessages || 0,
        totalVotes: totalVotes || 0,
        averageResponseTime: Math.round(averageResponseTime),
        gameDuration: Math.round(gameDuration)
      }
    })

  } catch (error) {
    console.error('Get game stats error:', error)
    
    return NextResponse.json<GetGameStatsResponse>({
      success: false,
      error: error instanceof Error ? error.message : '게임 통계 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
