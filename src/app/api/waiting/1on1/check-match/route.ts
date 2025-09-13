import { NextRequest, NextResponse } from 'next/server'
import { matchedUsersStore } from '@/utils/matchedUsersStore'

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

    const matchedUser = matchedUsersStore.getMatchedUser(sessionId)

    if (!matchedUser) {
      return NextResponse.json({
        success: true,
        isMatched: false
      })
    }

    return NextResponse.json({
      success: true,
      isMatched: true,
      roomId: matchedUser.actualRoomId || matchedUser.roomId,
      tag: matchedUser.tag,
      playerId: matchedUser.playerId
    })

  } catch (error) {
    console.error('매칭 상태 확인 오류:', error)
    return NextResponse.json(
      { error: '매칭 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
