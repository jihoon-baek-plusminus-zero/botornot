import { NextRequest, NextResponse } from 'next/server'
import { matchmakingQueueManager } from '@/utils/matchmakingQueue'

export async function POST(request: NextRequest) {
  try {
    // 세션 ID 생성 (실제로는 쿠키나 세션에서 가져와야 함)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const result = matchmakingQueueManager.joinQueue(sessionId)
    
    console.log('1:1 큐 참가:', result)
    
    return NextResponse.json({
      success: true,
      position: result.position,
      userId: result.userId,
      sessionId: sessionId
    })
  } catch (error) {
    console.error('1:1 큐 참가 오류:', error)
    return NextResponse.json(
      { success: false, error: '큐 참가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
