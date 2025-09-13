import { NextRequest, NextResponse } from 'next/server'
import { waitingQueueManager } from '@/utils/waitingQueueManager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: '세션 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 대기열에 사용자 추가
    const user = waitingQueueManager.addUser(sessionId)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        position: user.position,
        tag: user.tag,
        queueLength: waitingQueueManager.getQueueLength()
      }
    })

  } catch (error) {
    console.error('대기열 입장 오류:', error)
    return NextResponse.json(
      { error: '대기열 입장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: '세션 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 대기열에서 사용자 제거
    const removed = waitingQueueManager.removeUser(sessionId)
    
    return NextResponse.json({
      success: true,
      removed,
      queueLength: waitingQueueManager.getQueueLength()
    })

  } catch (error) {
    console.error('대기열 퇴장 오류:', error)
    return NextResponse.json(
      { error: '대기열 퇴장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
