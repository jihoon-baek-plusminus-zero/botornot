import { NextRequest, NextResponse } from 'next/server'
import { ChatRoomManager } from '@/utils/chatRoomManager'
import { chatRoomStore } from '@/utils/chatRoomStore'
import { PlayerType } from '@/types/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { totalPlayers, playerTypes } = body

    // 입력 검증
    if (!totalPlayers || totalPlayers < 2 || totalPlayers > 5) {
      return NextResponse.json(
        { error: '플레이어 수는 2-5명 사이여야 합니다.' },
        { status: 400 }
      )
    }

    if (!playerTypes || playerTypes.length !== totalPlayers) {
      return NextResponse.json(
        { error: '플레이어 타입 배열이 플레이어 수와 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    // 플레이어 타입 검증
    const validTypes: PlayerType[] = ['human', 'ai']
    for (const type of playerTypes) {
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: '유효하지 않은 플레이어 타입입니다.' },
          { status: 400 }
        )
      }
    }

    // 채팅방 생성
    const roomManager = new ChatRoomManager(totalPlayers, playerTypes)
    const room = roomManager.startGame()
    
    // 전역 저장소에 저장
    chatRoomStore.setRoom(room.id, roomManager)

    return NextResponse.json({
      success: true,
      room: room
    })

  } catch (error) {
    console.error('채팅방 생성 오류:', error)
    return NextResponse.json(
      { error: '채팅방 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
