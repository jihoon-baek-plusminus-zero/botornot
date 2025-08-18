import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { GetGameVotesResponse } from '@/types/game-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json<GetGameVotesResponse>({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<GetGameVotesResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 투표 조회
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select(`
        id,
        player_label,
        voted_for_player,
        timestamp
      `)
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })

    if (votesError) {
      console.error('Failed to get votes:', votesError)
      return NextResponse.json<GetGameVotesResponse>({
        success: false,
        error: '투표 조회에 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json<GetGameVotesResponse>({
      success: true,
      votes: votes?.map(vote => ({
        id: vote.id,
        playerLabel: vote.player_label,
        votedForPlayer: vote.voted_for_player,
        timestamp: vote.timestamp
      })) || []
    })

  } catch (error) {
    console.error('Get game votes error:', error)
    
    return NextResponse.json<GetGameVotesResponse>({
      success: false,
      error: error instanceof Error ? error.message : '투표 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
