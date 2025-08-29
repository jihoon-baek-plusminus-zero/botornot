import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MessageWithPlayer {
  content: string
  created_at: string
  players: {
    player_label: string
    is_ai: boolean
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { sessionId, content } = await request.json()

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'Session ID and content are required' },
        { status: 400 }
      )
    }

    // 1. 게임 상태 확인
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'active')
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found or inactive' },
        { status: 404 }
      )
    }

    // 2. 플레이어 확인
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found in this game' },
        { status: 403 }
      )
    }

    // 3. 메시지 저장
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        game_id: gameId,
        player_id: player.id,
        content: content.trim()
      })
      .select()
      .single()

    if (messageError) {
      console.error('Message insertion error:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // 4. 게임 활동 시간 업데이트
    await supabase
      .from('games')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', gameId)

    // 5. AI 플레이어가 있다면 AI 응답 처리
    if (!player.is_ai) {
      await processAIResponse(gameId)
    }

    return NextResponse.json({
      message: 'Message sent successfully',
      messageId: message.id
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processAIResponse(gameId: string) {
  // 1. AI 플레이어 찾기
  const { data: aiPlayer, error: aiError } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_ai', true)
    .eq('status', 'active')
    .single()

  if (aiError || !aiPlayer) {
    return // AI 플레이어가 없으면 종료
  }

  // 2. 대화 내역 가져오기
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      content,
      created_at,
      players!inner(player_label, is_ai)
    `)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })

  if (messagesError || !messages) {
    return
  }

  // 3. AI 응답 생성
  try {
    // 타입 안전성을 위해 unknown을 거쳐 타입 변환
    const conversationHistory = (messages as unknown as MessageWithPlayer[]).map(msg => ({
      role: msg.players.is_ai ? 'assistant' as const : 'user' as const,
      content: msg.content
    }))

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 AI vs Human 게임에 참가한 AI 플레이어입니다. 인간인 척 대화해야 하며, 자연스럽고 친근한 톤으로 응답하세요. 답변은 1-2문장 정도로 간결하게 해주세요.'
          },
          ...conversationHistory
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // 4. AI 응답 저장
    await supabase
      .from('messages')
      .insert({
        game_id: gameId,
        player_id: aiPlayer.id,
        content: aiResponse
      })

    // 5. 게임 활동 시간 업데이트
    await supabase
      .from('games')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', gameId)

  } catch (error) {
    console.error('AI response generation error:', error)
  }
}
