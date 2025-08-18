'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<{ success: boolean }> | void
  onVote: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
  isMyTurn?: boolean
  turnTimeRemaining?: number
}

export default function MessageInput({
  onSendMessage,
  onVote,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
  className,
  isMyTurn = false,
  turnTimeRemaining
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSendMessage = async () => {
    if (message.trim() && !disabled && !isLoading) {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await Promise.resolve(onSendMessage(message.trim()))
        if (result?.success) {
          setMessage('')
          // 높이 초기화
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
          }
        } else if (result?.error) {
          setError(result.error)
        }
      } catch (err) {
        setError('메시지 전송에 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 에러 메시지 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4",
      className
    )}>
      <div className="flex items-end space-x-2 sm:space-x-3">
        {/* 메시지 입력창 */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMyTurn ? placeholder : "다른 플레이어의 턴입니다..."}
            disabled={disabled || !isMyTurn}
            className={cn(
              "w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm lg:text-base",
              isMyTurn 
                ? "border-gray-300 dark:border-gray-600" 
                : "border-gray-200 dark:border-gray-700"
            )}
            rows={1}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            {message.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {message.length}/500
              </div>
            )}
            {isMyTurn && turnTimeRemaining !== undefined && (
              <div className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                {turnTimeRemaining}s
              </div>
            )}
          </div>
        </div>

        {/* 보내기 버튼 */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled || isLoading}
          className={cn(
            "px-3 sm:px-4 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0",
            (!message.trim() || disabled || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
