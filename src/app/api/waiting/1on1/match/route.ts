import { NextRequest, NextResponse } from 'next/server'
import { waitingQueueManager, WaitingUser } from '@/utils/waitingQueueManager'
import { matchedUsersStore } from '@/utils/matchedUsersStore'
import { ChatRoomManager } from '@/utils/chatRoomManager'
import { chatRoomStore } from '@/utils/chatRoomStore'

export async function POST(request: NextRequest) {
  try {
    // 매칭 처리 실행
    const result = waitingQueueManager.processMatching()
    
    // 매칭된 사용자들을 별도 저장소에 저장
    result.matched.forEach(user => {
      if (user.roomId) {
        matchedUsersStore.addMatchedUser(user.sessionId, user.roomId, user.tag)
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
        const playerTypes = users.map(user => user.tag === 'C' ? 'ai' : 'human')
        if (playerTypes.length === 1 && playerTypes[0] === 'ai') {
          // C태그 홀로 매칭 - AI와 대화
          playerTypes.push('ai')
        } else if (playerTypes.length === 1 && playerTypes[0] === 'human') {
          // A/B태그 홀로 매칭 - AI와 대화
          playerTypes.push('ai')
        }
        
        console.log(`채팅방 생성 요청: ${roomId}, 플레이어 타입:`, playerTypes)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/chatroom/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            totalPlayers: playerTypes.length,
            playerTypes: playerTypes
          })
        })

        console.log(`채팅방 생성 응답 상태: ${response.status}`)

        if (response.ok) {
          const roomData = await response.json()
          console.log(`채팅방 생성 완료: ${roomId} -> ${roomData.room.id}`)
          
          // 매칭된 사용자들에게 실제 채팅방 ID 업데이트
          users.forEach(user => {
            matchedUsersStore.updateActualRoomId(user.sessionId, roomData.room.id)
          })
        } else {
          const errorData = await response.text()
          console.error(`채팅방 생성 실패 (${roomId}):`, response.status, errorData)
          
          // 채팅방 생성 실패 시 직접 채팅방 생성
          try {
            console.log(`직접 채팅방 생성 시도: ${roomId}, 플레이어 타입:`, playerTypes)
            const roomManager = new ChatRoomManager(playerTypes.length, playerTypes)
            const room = roomManager.startGame()
            
            // 전역 저장소에 저장
            chatRoomStore.setRoom(room.id, roomManager)
            
            console.log(`직접 채팅방 생성 완료: ${roomId} -> ${room.id}`)
            
            // 매칭된 사용자들에게 실제 채팅방 ID 업데이트
            users.forEach(user => {
              matchedUsersStore.updateActualRoomId(user.sessionId, room.id)
            })
          } catch (directError) {
            console.error(`직접 채팅방 생성도 실패 (${roomId}):`, directError)
            
            // 모든 방법이 실패하면 기존 roomId 사용
            users.forEach(user => {
              matchedUsersStore.updateActualRoomId(user.sessionId, roomId)
            })
          }
        }
      } catch (error) {
        console.error(`채팅방 생성 오류 (${roomId}):`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      matched: result.matched.map(user => ({
        sessionId: user.sessionId,
        roomId: user.roomId,
        tag: user.tag
      })),
      unmatched: result.unmatched.map(user => ({
        sessionId: user.sessionId,
        position: user.position,
        tag: user.tag
      }))
    })

  } catch (error) {
    console.error('매칭 처리 오류:', error)
    return NextResponse.json(
      { error: '매칭 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
