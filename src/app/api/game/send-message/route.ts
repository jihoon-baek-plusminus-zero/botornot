import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { SendMessageRequest, SendMessageResponse } from '@/types/game-api'
import { PlayerLabel } from '@/types/game'
import { generateId } from '@/lib/utils'
import { broadcastMessage } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json()
    const { gameId, playerLabel, content } = body

    // 입력 검증
    if (!gameId || !playerLabel || !content) {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: 'gameId, playerLabel, content는 필수입니다.'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(playerLabel)) {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '유효하지 않은 playerLabel입니다.'
      }, { status: 400 })
    }

    if (content.trim().length === 0 || content.length > 500) {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '메시지는 1-500자 사이여야 합니다.'
      }, { status: 400 })
    }

    const supabase = createServerClient()

    // 게임 존재 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, current_turn')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 게임이 활성 상태인지 확인
    if (game.status !== 'active') {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '게임이 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 현재 턴인지 확인
    if (game.current_turn !== playerLabel) {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '당신의 턴이 아닙니다.'
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
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '플레이어를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    if (player.status !== 'active') {
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '플레이어가 활성 상태가 아닙니다.'
      }, { status: 400 })
    }

    // 메시지 ID 생성
    const messageId = generateId()

    // 메시지 저장
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        game_id: gameId,
        player_label: playerLabel,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        is_system_message: false
      })

    if (insertError) {
      console.error('Failed to insert message:', insertError)
      return NextResponse.json<SendMessageResponse>({
        success: false,
        error: '메시지 저장에 실패했습니다.'
      }, { status: 500 })
    }

    // 실시간 브로드캐스트
    try {
      await broadcastMessage(gameId, {
        id: messageId,
        playerLabel: playerLabel as PlayerLabel,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        isSystemMessage: false
      })
    } catch (broadcastError) {
      console.error('Failed to broadcast message:', broadcastError)
      // 브로드캐스트 실패는 메시지 전송 실패로 처리하지 않음
    }

    return NextResponse.json<SendMessageResponse>({
      success: true,
      messageId
    })

  } catch (error) {
    console.error('Send message error:', error)
    
    return NextResponse.json<SendMessageResponse>({
      success: false,
      error: error instanceof Error ? error.message : '메시지 전송 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
