'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  label: string
  color: string
  name: string
  isAI: boolean
  isActive: boolean
  hasVoted: boolean
}

interface PlayerListProps {
  players: Player[]
  currentTurn?: string
  myPlayerLabel?: string
  className?: string
}

export default function PlayerList({
  players,
  currentTurn,
  myPlayerLabel,
  className
}: PlayerListProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4",
      className
    )}>
      {/* 모바일: 가로 스크롤 */}
      <div className="lg:hidden flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-2">
        {players.map((player) => (
          <div
            key={player.label}
            className={cn(
              "flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex-shrink-0",
              currentTurn === player.label
                ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600"
                : "bg-gray-50 dark:bg-gray-700 border-2 border-transparent",
              !player.isActive && "opacity-50"
            )}
          >
            {/* 플레이어 아바타 */}
            <div 
              className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                player.color
              )}
            >
              {player.label}
            </div>

            {/* 플레이어 정보 */}
            <div className="flex items-center space-x-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                {player.label === myPlayerLabel ? '나' : `P${player.label}`}
              </span>
              
              {/* AI/사람 아이콘 */}
              {player.isAI ? (
                <Bot className="w-3 h-3 text-red-500 flex-shrink-0" />
              ) : (
                <User className="w-3 h-3 text-green-500 flex-shrink-0" />
              )}

              {/* 투표 상태 */}
              {player.hasVoted && (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full flex-shrink-0" />
              )}
            </div>

            {/* 현재 턴 표시 */}
            {currentTurn === player.label && (
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* 데스크톱: 세로 목록 */}
      <div className="hidden lg:block">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          플레이어 목록
        </h3>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.label}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
                currentTurn === player.label
                  ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600"
                  : "bg-gray-50 dark:bg-gray-700 border-2 border-transparent",
                !player.isActive && "opacity-50"
              )}
            >
              {/* 플레이어 아바타 */}
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0",
                  player.color
                )}
              >
                {player.label}
              </div>

              {/* 플레이어 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {player.label === myPlayerLabel ? '나' : `Player ${player.label}`}
                  </span>
                  
                  {/* AI/사람 아이콘 */}
                  {player.isAI ? (
                    <Bot className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}

                  {/* 투표 상태 */}
                  {player.hasVoted && (
                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                
                {/* 현재 턴 표시 */}
                {currentTurn === player.label && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    현재 턴
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
