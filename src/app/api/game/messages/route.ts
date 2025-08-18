import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { GetGameMessagesResponse } from '@/types/game-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!gameId) {
      return NextResponse.json<GetGameMessagesResponse>({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json<GetGameMessagesResponse>({
        success: false,
        error: 'limit은 1-100 사이여야 합니다.'
      }, { status: 400 })
    }

    if (offset < 0) {
      return NextResponse.json<GetGameMessagesResponse>({
        success: false,
        error: 'offset은 0 이상이어야 합니다.'
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
      return NextResponse.json<GetGameMessagesResponse>({
        success: false,
        error: '게임을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        player_label,
        content,
        timestamp,
        is_system_message
      `)
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Failed to get messages:', messagesError)
      return NextResponse.json<GetGameMessagesResponse>({
        success: false,
        error: '메시지 조회에 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json<GetGameMessagesResponse>({
      success: true,
      messages: messages?.map(message => ({
        id: message.id,
        playerLabel: message.player_label,
        content: message.content,
        timestamp: message.timestamp,
        isSystemMessage: message.is_system_message
      })) || []
    })

  } catch (error) {
    console.error('Get game messages error:', error)
    
    return NextResponse.json<GetGameMessagesResponse>({
      success: false,
      error: error instanceof Error ? error.message : '메시지 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
