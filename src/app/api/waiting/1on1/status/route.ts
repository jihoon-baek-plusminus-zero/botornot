import { NextRequest, NextResponse } from 'next/server'
import { waitingQueueManager } from '@/utils/waitingQueueManager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: '세션 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const user = waitingQueueManager.getUser(sessionId)
    const queueLength = waitingQueueManager.getQueueLength()

    if (!user) {
      return NextResponse.json(
        { error: '대기열에서 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        position: user.position,
        tag: user.tag,
        queueLength,
        joinedAt: user.joinedAt.toISOString()
      },
      queue: waitingQueueManager.getQueue().map(u => ({
        id: u.id,
        position: u.position,
        tag: u.tag
      }))
    })

  } catch (error) {
    console.error('대기열 상태 조회 오류:', error)
    return NextResponse.json(
      { error: '대기열 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
