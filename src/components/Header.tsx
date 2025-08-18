'use client'

import { Clock, Users, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  timeRemaining: number
  turnTimeRemaining?: number
  gameType: '1v1' | '1vn'
  currentTopic: string
  voteCount: number
  totalPlayers: number
  currentTurn?: string
  myPlayerLabel?: string
  onBackClick: () => void
}

export default function Header({
  timeRemaining,
  turnTimeRemaining,
  gameType,
  currentTopic,
  voteCount,
  totalPlayers,
  currentTurn,
  myPlayerLabel,
  onBackClick
}: HeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
      <div className="flex items-center justify-between">
        {/* 좌측: 뒤로가기 버튼과 남은 시간 */}
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
          <button
            onClick={onBackClick}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="text-base sm:text-lg lg:text-xl font-mono font-semibold text-gray-900 dark:text-white">
              {formatTime(timeRemaining)}
            </span>
          </div>
          {/* 턴 타이머 */}
          {turnTimeRemaining !== undefined && currentTurn && (
            <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                턴:
              </span>
              <span className={cn(
                "text-xs sm:text-sm font-mono font-semibold",
                currentTurn === myPlayerLabel 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-gray-600 dark:text-gray-400"
              )}>
                Player {currentTurn}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({turnTimeRemaining}s)
              </span>
            </div>
          )}
        </div>

        {/* 중앙: 게임 제목 */}
        <div className="text-center min-w-0 flex-1 px-2 sm:px-4">
          <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
            {gameType === '1v1' ? '1:1 Game' : '1:N Game'}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 truncate">
            {currentTopic}
          </p>
        </div>

        {/* 우측: 투표 현황 */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 hidden sm:inline">
            {voteCount}/{totalPlayers} Selected Vote
          </span>
          <span className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 sm:hidden">
            {voteCount}/{totalPlayers}
          </span>
        </div>
      </div>
    </header>
  )
}
