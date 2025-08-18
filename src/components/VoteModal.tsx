'use client'

import { useState } from 'react'
import { X, Vote, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  label: string
  color: string
  name: string
}

interface VoteModalProps {
  isOpen: boolean
  onClose: () => void
  onVote: (selectedPlayers: string[]) => Promise<any> | void
  gameType: '1v1' | '1vn'
  players: Player[]
  timeRemaining: number
  myPlayerLabel: string
}

export default function VoteModal({
  isOpen,
  onClose,
  onVote,
  gameType,
  players,
  timeRemaining,
  myPlayerLabel
}: VoteModalProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlayerSelect = (playerLabel: string) => {
    if (gameType === '1v1') {
      // 1:1 게임에서는 하나만 선택
      setSelectedPlayers([playerLabel])
    } else {
      // 1:N 게임에서는 2개까지 선택 가능
      setSelectedPlayers(prev => {
        if (prev.includes(playerLabel)) {
          return prev.filter(p => p !== playerLabel)
        } else if (prev.length < 2) {
          return [...prev, playerLabel]
        }
        return prev
      })
    }
  }

  const handleVote = async () => {
    if (selectedPlayers.length > 0 && !isLoading) {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await Promise.resolve(onVote(selectedPlayers))
        if (result?.success) {
          setSelectedPlayers([])
        } else if (result?.error) {
          setError(result.error)
        }
      } catch (err) {
        setError('투표 제출에 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              투표 시간
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 타이머 */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-mono font-bold text-red-500">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <p className="text-center text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-2">
            {gameType === '1v1' 
              ? '상대방이 AI인지 사람인지 선택하세요'
              : 'AI로 의심되는 플레이어 2명을 선택하세요'
            }
          </p>
        </div>

        {/* 플레이어 목록 */}
        <div className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {players
              .filter(player => player.label !== myPlayerLabel) // 자신은 제외
              .map((player) => (
                <button
                  key={player.label}
                  onClick={() => handlePlayerSelect(player.label)}
                  className={cn(
                    "w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 sm:space-x-3",
                    selectedPlayers.includes(player.label)
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  <div 
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0",
                      player.color
                    )}
                  >
                    {player.label}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      Player {player.label}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {player.name}
                    </p>
                  </div>
                  {selectedPlayers.includes(player.label) && (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>

        {/* 투표 버튼 */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleVote}
            disabled={selectedPlayers.length === 0 || isLoading}
            className={cn(
              "w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base",
              (selectedPlayers.length === 0 || isLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>투표 제출 중...</span>
              </>
            ) : (
              <span>
                {gameType === '1v1' 
                  ? `투표하기 (${selectedPlayers.length}/1)`
                  : `투표하기 (${selectedPlayers.length}/2)`
                }
              </span>
            )}
          </button>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-3 p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
