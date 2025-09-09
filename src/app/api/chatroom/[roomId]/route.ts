import { NextRequest, NextResponse } from 'next/server'
import { ChatRoomManager } from '@/utils/chatRoomManager'
import { chatRoomStore } from '@/utils/chatRoomStore'
import { aiService } from '@/utils/aiService'

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    console.log(`채팅방 조회 요청: ${roomId}`)
    const roomManager = chatRoomStore.getRoom(roomId)

    if (!roomManager) {
      return NextResponse.json(
        { error: '채팅방을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const roomState = roomManager.getRoomState()
    return NextResponse.json({
      success: true,
      room: roomState
    })

  } catch (error) {
    console.error('채팅방 조회 오류:', error)
    return NextResponse.json(
      { error: '채팅방 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    const body = await request.json()
    const { action, playerId, message } = body

    const roomManager = chatRoomStore.getRoom(roomId)
    if (!roomManager) {
      return NextResponse.json(
        { error: '채팅방을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'send_message':
        return await handleSendMessage(roomManager, playerId, message, roomId)
      
      case 'get_room_state':
        const roomState = roomManager.getRoomState()
        return NextResponse.json({
          success: true,
          room: roomState
        })
      
      default:
        return NextResponse.json(
          { error: '유효하지 않은 액션입니다.' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('채팅방 액션 처리 오류:', error)
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

async function handleSendMessage(
  roomManager: ChatRoomManager,
  playerId: number,
  message: string,
  roomId: string
) {
  try {
    // 플레이어가 현재 차례인지 확인
    if (!roomManager.isPlayerTurn(playerId)) {
      return NextResponse.json(
        { error: '현재 당신의 차례가 아닙니다.' },
        { status: 400 }
      )
    }

    const player = roomManager.getPlayer(playerId)
    if (!player) {
      return NextResponse.json(
        { error: '플레이어를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 메시지 추가
    const newMessage = roomManager.addMessage(playerId, message)
    
    // 다음 차례로 이동
    roomManager.nextTurn()
    
    // 채팅방 상태 저장
    chatRoomStore.setRoom(roomId, roomManager)
    
    // 현재 차례인 플레이어가 AI인지 확인
    const currentPlayer = roomManager.getCurrentPlayer()
    if (currentPlayer && currentPlayer.type === 'ai') {
      // AI 응답 생성
      const aiContext = roomManager.generateAIContext(currentPlayer.id)
      const aiResponse = await aiService.generateResponse(aiContext)
      
      if (aiResponse.success && aiResponse.message) {
        // AI 메시지 추가
        const aiMessage = roomManager.addMessage(currentPlayer.id, aiResponse.message)
        
        // 다시 다음 차례로 이동
        roomManager.nextTurn()
        
        // AI 응답 후 채팅방 상태 저장
        chatRoomStore.setRoom(roomId, roomManager)
        
        return NextResponse.json({
          success: true,
          message: newMessage,
          aiMessage: aiMessage,
          room: roomManager.getRoomState()
        })
      } else {
        // AI 응답 실패 시 에러 메시지 추가
        const errorMessage = roomManager.addMessage(
          currentPlayer.id, 
          '죄송합니다. 응답을 생성할 수 없습니다.'
        )
        roomManager.nextTurn()
        
        // 에러 메시지 후 채팅방 상태 저장
        chatRoomStore.setRoom(roomId, roomManager)
        
        return NextResponse.json({
          success: true,
          message: newMessage,
          aiMessage: errorMessage,
          room: roomManager.getRoomState()
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
      room: roomManager.getRoomState()
    })

  } catch (error) {
    console.error('메시지 전송 오류:', error)
    return NextResponse.json(
      { error: '메시지 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

