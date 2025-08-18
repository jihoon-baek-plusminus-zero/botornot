'use client'

import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  playerLabel: string
  playerColor: string
  messageContent: string
  isMyMessage: boolean
  timestamp?: string
}

export default function ChatBubble({
  playerLabel,
  playerColor,
  messageContent,
  isMyMessage,
  timestamp
}: ChatBubbleProps) {
  return (
    <div className={cn(
      "flex items-start space-x-2 sm:space-x-3",
      isMyMessage && "justify-end"
    )}>
      {/* 내 메시지가 아닐 때만 아바타 표시 */}
      {!isMyMessage && (
        <div 
          className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0",
            playerColor
          )}
        >
          {playerLabel}
        </div>
      )}

      {/* 메시지 컨테이너 */}
      <div className={cn(
        "flex-1 min-w-0",
        isMyMessage && "text-right"
      )}>
        {/* 메시지 말풍선 */}
        <div className={cn(
          "rounded-lg px-3 sm:px-4 py-2 shadow-sm inline-block max-w-[200px] sm:max-w-xs lg:max-w-md",
          isMyMessage 
            ? "bg-blue-500 text-white" 
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        )}>
          <p className="text-xs sm:text-sm lg:text-base leading-relaxed break-words">
            {messageContent}
          </p>
        </div>

        {/* 타임스탬프 */}
        {timestamp && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isMyMessage ? `나 • ${timestamp}` : `Player ${playerLabel} • ${timestamp}`}
          </p>
        )}
      </div>

      {/* 내 메시지일 때만 아바타 표시 */}
      {isMyMessage && (
        <div 
          className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0",
            playerColor
          )}
        >
          {playerLabel}
        </div>
      )}
    </div>
  )
}
