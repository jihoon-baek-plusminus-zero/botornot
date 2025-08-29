'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function WaitingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const gameType = searchParams.get('gameType')
  
  const [waitingTime, setWaitingTime] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')

  const checkMatchStatus = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    try {
      const response = await fetch('/api/matchmaking/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        throw new Error('매칭 상태 확인 실패')
      }

      const data = await response.json()
      
      if (data.isMatched && data.gameId) {
        // 매칭 완료! 게임 페이지로 이동
        router.push(`/game/${data.gameId}?sessionId=${sessionId}`)
      }
    } catch (error) {
      console.error('Match status check error:', error)
      setError('매칭 상태 확인 중 오류가 발생했습니다.')
    } finally {
      setIsChecking(false)
    }
  }, [sessionId, isChecking, router])

  useEffect(() => {
    if (!sessionId || !gameType) {
      setError('잘못된 접근입니다.')
      return
    }

    // 매칭 상태 확인 시작
    checkMatchStatus()

    // 5초마다 매칭 상태 확인
    const interval = setInterval(checkMatchStatus, 5000)

    // 타이머 시작
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(timer)
    }
  }, [sessionId, gameType, checkMatchStatus])

  const handleCancel = async () => {
    try {
      await fetch('/api/matchmaking/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })
    } catch (error) {
      console.error('Cancel error:', error)
    }
    
    // 메인 페이지로 돌아가기
    router.push('/')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-4">
              오류가 발생했습니다
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* 상단부 - 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            매칭 취소
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {gameType === '1v1' ? '1:1 게임' : '1:N 게임'} 매칭 대기
          </h1>
          <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </div>

      {/* 중앙부 - 대기 화면 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {/* 로딩 애니메이션 */}
          <div className="mb-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* 대기 메시지 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            상대를 찾고 있습니다...
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {gameType === '1v1' 
              ? '다른 플레이어나 AI와 매칭 중입니다.'
              : '다른 플레이어들과 매칭 중입니다.'
            }
          </p>

          {/* 대기 시간 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">대기 시간</p>
            <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatTime(waitingTime)}
            </p>
          </div>

          {/* 매칭 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">게임 모드</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {gameType === '1v1' ? '1:1 대결' : '1:N 대결'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">예상 시간</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {gameType === '1v1' ? '~2분' : '~5분'}
                </p>
              </div>
            </div>
          </div>

          {/* 상태 표시 */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>매칭 서버에 연결됨</span>
          </div>
        </div>
      </div>

      {/* 하단부 - 팁 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 팁: 매칭이 완료되면 자동으로 게임이 시작됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">로딩 중...</p>
      </div>
    </div>
  )
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WaitingPageContent />
    </Suspense>
  )
}
