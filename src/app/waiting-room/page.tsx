'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function WaitingRoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const gameType = searchParams.get('gameType')
  
  const [waitingTime, setWaitingTime] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const [waitingInfo, setWaitingInfo] = useState<{
    position: number
    totalWaiting: number
    gameType: string
    joinedAt: string
  } | null>(null)

  const checkWaitingRoomStatus = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    try {
      const response = await fetch('/api/matchmaking/check-waiting-room-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        throw new Error('대기방 상태 확인 실패')
      }

      const data = await response.json()
      
      if (data.isMatched && data.gameId) {
        // 매칭 완료! 게임 페이지로 이동
        router.push(`/game/${data.gameId}?sessionId=${sessionId}`)
      } else {
        // 대기 정보 업데이트
        setWaitingInfo({
          position: data.position,
          totalWaiting: data.totalWaiting,
          gameType: data.gameType,
          joinedAt: data.joinedAt
        })
      }
    } catch (error) {
      console.error('Waiting room status check error:', error)
      setError('대기방 상태 확인 중 오류가 발생했습니다.')
    } finally {
      setIsChecking(false)
    }
  }, [sessionId, isChecking, router])

  useEffect(() => {
    if (!sessionId || !gameType) {
      setError('잘못된 접근입니다.')
      return
    }

    // 대기방 상태 확인 시작
    checkWaitingRoomStatus()

    // 3초마다 대기방 상태 확인
    const interval = setInterval(checkWaitingRoomStatus, 3000)

    // 타이머 시작
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(timer)
    }
  }, [sessionId, gameType, checkWaitingRoomStatus])

  const handleLeaveWaitingRoom = async () => {
    try {
      await fetch('/api/matchmaking/leave-waiting-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })
    } catch (error) {
      console.error('Leave waiting room error:', error)
    }
    
    // 메인 페이지로 돌아가기
    router.push('/')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getExpectedMatchType = (position: number) => {
    // 매칭 카운터 기반으로 예상 매칭 타입 계산
    // position이 1이면 첫 번째 플레이어
    if (position === 1) {
      return 'AI와 매칭 예정'
    } else if (position === 2) {
      return '다른 플레이어와 매칭 예정'
    } else {
      // 3번째부터는 번갈아가며
      const adjustedPosition = position - 1 // 첫 번째 플레이어 제외
      return adjustedPosition % 2 === 0 ? 'AI와 매칭 예정' : '다른 플레이어와 매칭 예정'
    }
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
    <div className="h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* 상단부 - 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLeaveWaitingRoom}
            className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            대기방 나가기
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            매칭 대기방
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
              <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* 대기 메시지 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            매칭 대기 중...
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {gameType === '1v1' 
              ? 'AI 또는 다른 플레이어와 매칭 중입니다.'
              : '다른 플레이어들과 매칭 중입니다.'
            }
          </p>

          {/* 대기열 정보 */}
          {waitingInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">대기열 순서</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {waitingInfo.position}번째
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    총 {waitingInfo.totalWaiting}명 대기 중
                  </p>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">예상 매칭</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getExpectedMatchType(waitingInfo.position)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 대기 시간 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">대기 시간</p>
            <p className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
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
                  {gameType === '1v1' ? '~1분' : '~3분'}
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
    <div className="h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">로딩 중...</p>
      </div>
    </div>
  )
}

export default function WaitingRoomPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WaitingRoomContent />
    </Suspense>
  )
}
