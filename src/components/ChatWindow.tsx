'use client'

import { useEffect, useRef } from 'react'
import ChatBubble from './ChatBubble'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  playerLabel: string
  playerColor: string
  content: string
  isMyMessage: boolean
  timestamp: string
}

interface ChatWindowProps {
  messages: Message[]
  systemMessage?: string
  gameStatus?: string
  currentTurn?: string
  myPlayerLabel?: string
  className?: string
}

export default function ChatWindow({
  messages,
  systemMessage,
  gameStatus,
  currentTurn,
  myPlayerLabel,
  className
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 새 메시지가 올 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={cn(
      "flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3 lg:space-y-4",
      className
    )}>
      {/* 시스템 메시지 */}
      {systemMessage && (
        <div className="flex justify-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base max-w-xs sm:max-w-md lg:max-w-lg text-center">
            {systemMessage}
          </div>
        </div>
      )}

      {/* 게임 상태 메시지 */}
      {gameStatus === 'waiting' && (
        <div className="flex justify-center">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base max-w-xs sm:max-w-md lg:max-w-lg text-center">
            게임 시작을 기다리는 중...
          </div>
        </div>
      )}

      {gameStatus === 'voting' && (
        <div className="flex justify-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base max-w-xs sm:max-w-md lg:max-w-lg text-center">
            투표 시간입니다! AI로 의심되는 플레이어를 선택하세요.
          </div>
        </div>
      )}

      {gameStatus === 'finished' && (
        <div className="flex justify-center">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base max-w-xs sm:max-w-md lg:max-w-lg text-center">
            게임이 종료되었습니다. 결과를 확인하세요.
          </div>
        </div>
      )}

      {/* 턴 안내 메시지 */}
      {gameStatus === 'active' && currentTurn && (
        <div className="flex justify-center">
          <div className={cn(
            "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base max-w-xs sm:max-w-md lg:max-w-lg text-center",
            currentTurn === myPlayerLabel
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200"
          )}>
            {currentTurn === myPlayerLabel 
              ? "당신의 턴입니다! 메시지를 입력하세요." 
              : `Player ${currentTurn}의 턴입니다. 기다려주세요...`
            }
          </div>
        </div>
      )}

      {/* 메시지들 */}
      <div className="space-y-2 sm:space-y-3 lg:space-y-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            playerLabel={message.playerLabel}
            playerColor={message.playerColor}
            messageContent={message.content}
            isMyMessage={message.isMyMessage}
            timestamp={message.timestamp}
          />
        ))}
      </div>

      {/* 스크롤을 위한 빈 div */}
      <div ref={messagesEndRef} />
    </div>
  )
}
