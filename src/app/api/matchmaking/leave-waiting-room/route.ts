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

    // 대기방에서 플레이어 제거
    const { error: deleteError } = await supabase
      .from('waiting_room')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) {
      console.error('Error leaving waiting room:', deleteError)
      return NextResponse.json(
        { error: 'Failed to leave waiting room' },
        { status: 500 }
      )
    }

    console.log('Player left waiting room:', sessionId)

    return NextResponse.json({
      message: 'Successfully left waiting room',
      success: true
    })

  } catch (error) {
    console.error('Leave waiting room error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
