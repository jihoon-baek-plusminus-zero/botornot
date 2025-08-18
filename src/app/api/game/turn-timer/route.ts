import { NextRequest, NextResponse } from 'next/server'
import { updateTurnTimer } from '@/lib/turn-management'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId } = body

    if (!gameId) {
      return NextResponse.json({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    // 턴 타이머 업데이트
    await updateTurnTimer(gameId)

    return NextResponse.json({
      success: true,
      message: '턴 타이머가 업데이트되었습니다.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Turn timer update error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '턴 타이머 업데이트 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// GET 요청으로도 처리 가능 (크론잡 등에서 호출)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    // 턴 타이머 업데이트
    await updateTurnTimer(gameId)

    return NextResponse.json({
      success: true,
      message: '턴 타이머가 업데이트되었습니다.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Turn timer update error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '턴 타이머 업데이트 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
