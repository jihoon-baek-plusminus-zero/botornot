import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { SubmitVoteRequest, SubmitVoteResponse } from '@/types/game-api'
import { PlayerLabel } from '@/types/game'
import { generateId } from '@/lib/utils'
import { broadcastVoteSubmitted } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const body: SubmitVoteRequest = await request.json()
    const { gameId, playerLabel, votedForPlayer, voteType } = body

    // 입력 검증
    if (!gameId || !playerLabel || !votedForPlayer) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: 'gameId, playerLabel, votedForPlayer는 필수입니다.'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(playerLabel) || !['A', 'B', 'C', 'D', 'E'].includes(votedForPlayer)) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '유효하지 않은 playerLabel 또는 votedForPlayer입니다.'
      }, { status: 400 })
    }

    // 자신에게 투표하는 것 방지
    if (playerLabel === votedForPlayer) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '자신에게는 투표할 수 없습니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, type')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 게임이 투표 상태인지 확인
    if (game.status !== 'voting') {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '현재 투표 시간이 아닙니다.'
      }, { status: 400 })
    }

    // 플레이어 존재 확인
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('player_label, status')
      .eq('game_id', gameId)
      .eq('player_label', playerLabel)
      .single()

    if (playerError || !player) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '플레이어를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (player.status !== 'active') {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '플레이어가 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 투표 대상 플레이어 존재 확인
    const { data: targetPlayer, error: targetPlayerError } = await supabase
      .from('players')
      .select('player_label, status')
      .eq('game_id', gameId)
      .eq('player_label', votedForPlayer)
      .single()

    if (targetPlayerError || !targetPlayer) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '투표 대상 플레이어를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (targetPlayer.status !== 'active') {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '투표 대상 플레이어가 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 이미 투표했는지 확인
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_label', playerLabel)
      .single()

    if (voteCheckError && voteCheckError.code !== 'PGRST116') { // PGRST116는 결과가 없음을 의미
      console.error('Vote check error:', voteCheckError)
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '투표 확인 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    if (existingVote) {
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '이미 투표했습니다.'
      }, { status: 400 })
    }

    // 투표 ID 생성
    const voteId = generateId()

    // 투표 데이터 준비
    const voteData: any = {
      id: voteId,
      game_id: gameId,
      voter_player_label: playerLabel,
      voted_for_players: [votedForPlayer],
      timestamp: new Date().toISOString()
    }

    // 1:1 게임에서 AI/Human 선택이 있는 경우 추가 정보 저장
    if (voteType) {
      voteData.vote_type = voteType
      voteData.confidence = voteType === 'ai' ? 0.8 : 0.2 // AI 선택 시 높은 신뢰도, Human 선택 시 낮은 신뢰도
      voteData.reasoning = voteType === 'ai' ? 'AI로 판단됨' : 'Human으로 판단됨'
    }

    // 투표 저장
    const { error: insertError } = await supabase
      .from('votes')
      .insert(voteData)

    if (insertError) {
      console.error('Failed to insert vote:', insertError)
      return NextResponse.json<SubmitVoteResponse>({
        success: false,
        error: '투표 저장에 실패했습니다.'
      }, { status: 500 })
    }

    // 전체 플레이어 수와 투표 수 확인
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_label')
      .eq('game_id', gameId)
      .eq('status', 'active')

    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('id')
      .eq('game_id', gameId)

    if (playersError || votesError) {
      console.error('Failed to get players or votes count:', playersError || votesError)
    } else {
      const totalPlayers = players?.length || 0
      const totalVotes = votes?.length || 0

      // 모든 플레이어가 투표했는지 확인
      if (totalVotes >= totalPlayers) {
        // 게임 상태를 finished로 변경
        await supabase
          .from('games')
          .update({ 
            status: 'finished',
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)
      }
    }

    // 실시간 브로드캐스트
    try {
      await broadcastVoteSubmitted(gameId, {
        playerLabel: playerLabel as PlayerLabel,
        votedForPlayer: votedForPlayer as PlayerLabel,
        timestamp: new Date().toISOString()
      })
    } catch (broadcastError) {
      console.error('Failed to broadcast vote:', broadcastError)
      // 브로드캐스트 실패는 투표 실패로 처리하지 않음
    }

    return NextResponse.json<SubmitVoteResponse>({
      success: true,
      voteId
    })

  } catch (error) {
    console.error('Submit vote error:', error)
    
    return NextResponse.json<SubmitVoteResponse>({
      success: false,
      error: error instanceof Error ? error.message : '투표 제출 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
