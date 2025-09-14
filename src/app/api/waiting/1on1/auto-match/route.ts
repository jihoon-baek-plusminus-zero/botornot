import { NextRequest, NextResponse } from 'next/server'
import { waitingQueueManager, WaitingUser } from '@/utils/waitingQueueManager'
import { matchedUsersStore } from '@/utils/matchedUsersStore'
import { ChatRoomManager } from '@/utils/chatRoomManager'
import { chatRoomStore } from '@/utils/chatRoomStore'

export async function POST(request: NextRequest) {
  try {
    // 자동 매칭 처리 실행
    const result = waitingQueueManager.processMatching()
    
    // 매칭된 사용자들을 별도 저장소에 저장
    result.matched.forEach(user => {
      if (user.roomId && user.playerId !== undefined) {
        matchedUsersStore.addMatchedUser(user.sessionId, user.roomId, user.tag, user.playerId)
      }
    })

    // 매칭된 사용자들을 위한 채팅방 생성
    const roomGroups = new Map<string, WaitingUser[]>()
    result.matched.forEach(user => {
      if (user.roomId) {
        if (!roomGroups.has(user.roomId)) {
          roomGroups.set(user.roomId, [])
        }
        roomGroups.get(user.roomId)!.push(user)
      }
    })

    // 각 채팅방 생성
    for (const [roomId, users] of roomGroups) {
      try {
        const playerTypes = users.map(user => 'human') // 모든 사용자는 human
        if (playerTypes.length === 1) {
          // 홀로 매칭 - AI와 대화
          playerTypes.push('ai')
        }
        
        console.log(`채팅방 생성 시도: ${roomId}, 플레이어 타입:`, playerTypes)
        
        // 서버 내부에서 직접 채팅방 생성 (HTTP fetch 대신)
        try {
          const roomManager = new ChatRoomManager(playerTypes.length, playerTypes)
          const room = roomManager.startGame()
          
          // 전역 저장소에 저장
          chatRoomStore.setRoom(room.id, roomManager)
          
          console.log(`채팅방 생성 완료: ${roomId} -> ${room.id}`)
          
          // 매칭된 사용자들에게 실제 채팅방 ID 업데이트
          users.forEach(user => {
            matchedUsersStore.updateActualRoomId(user.sessionId, room.id)
          })
        } catch (directError) {
          console.error(`채팅방 생성 실패 (${roomId}):`, directError)
          
          // 채팅방 생성 실패 시 기존 roomId 사용
          users.forEach(user => {
            matchedUsersStore.updateActualRoomId(user.sessionId, roomId)
          })
        }
      } catch (error) {
        console.error(`채팅방 생성 오류 (${roomId}):`, error)
      }
    }
    
    console.log(`자동 매칭 완료: ${result.matched.length}명 매칭, ${result.unmatched.length}명 대기 중`)
    
    return NextResponse.json({
      success: true,
      matchedCount: result.matched.length,
      unmatchedCount: result.unmatched.length,
      matched: result.matched.map(user => ({
        sessionId: user.sessionId,
        roomId: user.roomId,
        tag: user.tag
      }))
    })

  } catch (error) {
    console.error('자동 매칭 처리 오류:', error)
    return NextResponse.json(
      { error: '자동 매칭 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
