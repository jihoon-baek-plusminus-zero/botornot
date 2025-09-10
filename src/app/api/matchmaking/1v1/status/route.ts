import { NextRequest, NextResponse } from 'next/server'
import { matchmakingQueueManager } from '@/utils/matchmakingQueue'

export async function GET(request: NextRequest) {
  try {
    // URL에서 세션 ID 가져오기 (실제로는 쿠키나 세션에서 가져와야 함)
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const status = matchmakingQueueManager.getQueueStatus(sessionId)
    
    return NextResponse.json({
      success: true,
      position: status.position,
      matched: status.matched,
      roomId: status.roomId,
      playerId: status.playerId
    })
  } catch (error) {
    console.error('매칭 상태 확인 오류:', error)
    return NextResponse.json(
      { success: false, error: '매칭 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
