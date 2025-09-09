'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChatRoom, ChatMessage, Player } from '@/types/chat'

export default function ChatRoom() {
  const [message, setMessage] = useState('')
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const roomId = searchParams.get('roomId')
  const playerId = searchParams.get('playerId')

  useEffect(() => {
    if (roomId && playerId) {
      setCurrentPlayerId(parseInt(playerId))
      fetchRoomState()
      
      // 실시간 폴링 설정 (2초마다 최신 메시지 조회)
      const interval = setInterval(() => {
        fetchRoomState()
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [roomId, playerId])

  const fetchRoomState = async () => {
    if (!roomId) return
    
    try {
      console.log(`채팅방 상태 조회 시작: ${roomId}`)
      const response = await fetch(`/api/chatroom/${roomId}`)
      console.log(`응답 상태: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('채팅방 데이터:', data)
        setRoom(data.room)
        
        // AI 차례인지 확인하고 AI 응답 처리
        const currentPlayer = data.room.players.find((p: any) => p.isActive)
        if (currentPlayer && currentPlayer.type === 'ai') {
          await processAITurn()
        }
      } else {
        const errorData = await response.json()
        console.error('채팅방 조회 실패:', errorData)
      }
    } catch (error) {
      console.error('채팅방 상태 조회 오류:', error)
    }
  }

  const processAITurn = async () => {
    if (!roomId) return
    
    try {
      const response = await fetch(`/api/chatroom/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_ai_turn'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRoom(data.room)
        }
      }
    } catch (error) {
      console.error('AI 차례 처리 오류:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !room || currentPlayerId === null || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/chatroom/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          playerId: currentPlayerId,
          message: message.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRoom(data.room)
        setMessage('')
      } else {
        const errorData = await response.json()
        console.error('메시지 전송 실패:', errorData.error)
      }
    } catch (error) {
      console.error('메시지 전송 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleGoBack = () => {
    router.push('/')
  }

  const isMyTurn = room && currentPlayerId !== null && room.players[currentPlayerId]?.isActive
  const currentPlayer = room?.players.find(p => p.isActive)

  if (!room) {
    return (
      <div className="h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-dark-text mb-4">채팅방을 불러오는 중...</div>
          {roomId && (
            <div className="text-dark-text-secondary text-sm">
              Room ID: {roomId}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-dark-bg flex flex-col">
      {/* 상단바 */}
      <div className="bg-dark-card border-b border-dark-border p-4 flex items-center justify-between">
        <button 
          onClick={handleGoBack}
          className="text-dark-text hover:text-dark-accent transition-colors"
        >
          ← 나가기
        </button>
        <h1 className="text-lg font-semibold text-dark-text">AI 채팅방</h1>
        <div className="text-sm text-dark-text-secondary">
          {currentPlayer ? `${currentPlayer.profileName} 차례` : ''}
        </div>
      </div>

      {/* 중앙 대화창 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {room.messages.length === 0 ? (
          <div className="text-center text-dark-text-secondary mt-8">
            {isMyTurn ? '첫 메시지를 입력해주세요!' : `${currentPlayer?.profileName}의 차례입니다...`}
          </div>
        ) : (
          room.messages.map((msg) => {
            const isMyMessage = msg.playerId === currentPlayerId
            const messagePlayer = room.players.find(p => p.id === msg.playerId)
            
            if (isMyMessage) {
              // 내 메시지
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-dark-accent rounded-lg p-3 max-w-xs">
                    <p className="text-white text-sm">{msg.content}</p>
                  </div>
                </div>
              )
            } else {
              // 상대방 메시지
              return (
                <div key={msg.id} className="flex items-start space-x-3">
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-dark-text-secondary mb-1">
                      {messagePlayer?.profileName}
                    </div>
                    <div className="w-8 h-8 bg-dark-border rounded-full flex items-center justify-center">
                      <span className="text-dark-text">?</span>
                    </div>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-lg p-3 max-w-xs">
                    <p className="text-dark-text text-sm">{msg.content}</p>
                  </div>
                </div>
              )
            }
          })
        )}
      </div>

      {/* 하단바 */}
      <div className="bg-dark-card border-t border-dark-border p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMyTurn ? "메시지를 입력하세요..." : "다른 플레이어의 차례입니다..."}
            disabled={!isMyTurn || isLoading}
            className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-dark-accent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isMyTurn || isLoading || !message.trim()}
            className="bg-dark-accent hover:bg-dark-accent-hover text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : '↵'}
          </button>
        </div>
      </div>
    </div>
  )
}
