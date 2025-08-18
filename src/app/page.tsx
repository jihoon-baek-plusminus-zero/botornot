'use client'

import { useState } from 'react'
import { Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGameStart = async (gameType: '1v1' | '1vn') => {
    setIsLoading(true)
    // TODO: 게임 매치메이킹 로직 구현
    console.log(`Starting ${gameType} game...`)
    
    // 임시로 게임 페이지로 이동
    setTimeout(() => {
      setIsLoading(false)
      window.location.href = '/game'
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
        {/* 게임 로고 및 제목 */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
            BotOrNot
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300">
            AI vs Human 추리 게임
          </p>
          <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
            대화 상대가 AI인지 사람인지 맞춰보세요!
          </p>
        </div>

        {/* 게임 모드 선택 */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          {/* 1:1 게임 버튼 */}
          <button
            onClick={() => handleGameStart('1v1')}
            disabled={isLoading}
            className={cn(
              "w-full p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-200 dark:hover:border-gray-700",
              "flex items-center justify-between group",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate">
                  1:1 게임
                </h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 truncate">
                  한 명의 상대와 대화하며 정체를 추리
                </p>
              </div>
            </div>
            <div className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2">
              →
            </div>
          </button>

          {/* 1:N 게임 버튼 */}
          <button
            onClick={() => handleGameStart('1vn')}
            disabled={isLoading}
            className={cn(
              "w-full p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-purple-200 dark:hover:border-gray-700",
              "flex items-center justify-between group",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate">
                  1:N 게임
                </h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 truncate">
                  여러 명 중 AI 2명을 찾아내는 게임
                </p>
              </div>
            </div>
            <div className="text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2">
              →
            </div>
          </button>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="mt-6 sm:mt-8 lg:mt-10 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm sm:text-base">게임 매칭 중...</span>
            </div>
          </div>
        )}

        {/* 게임 설명 */}
        <div className="mt-8 sm:mt-12 lg:mt-16 p-3 sm:p-4 lg:p-5 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">
            게임 방법
          </h4>
          <ul className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-1.5">
            <li>• 주어진 주제로 대화를 나누세요</li>
            <li>• 상대방의 정체를 추리해보세요</li>
            <li>• 모든 데이터는 게임 종료 시 삭제됩니다</li>
            <li>• 완전 익명으로 안전하게 즐기세요</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
