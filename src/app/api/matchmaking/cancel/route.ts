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

    // 1. 대기열에서 해당 세션 찾기
    const { data: queueEntry, error: queueError } = await supabase
      .from('matchmaking_queue_1v1')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'waiting')
      .single()

    if (queueError || !queueEntry) {
      return NextResponse.json(
        { error: 'No active queue entry found' },
        { status: 404 }
      )
    }

    // 2. 대기열 상태를 cancelled로 변경
    const { error: updateError } = await supabase
      .from('matchmaking_queue_1v1')
      .update({ status: 'cancelled' })
      .eq('id', queueEntry.id)

    if (updateError) {
      console.error('Cancel queue error:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel matchmaking' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Matchmaking cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
