'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface WaitingUser {
  id: string
  position: number
  tag: 'A' | 'B' | 'C'
  queueLength: number
  joinedAt: string
}

interface MatchedUser {
  isMatched: boolean
  roomId?: string
  tag?: 'A' | 'B' | 'C'
  playerId?: number
}

export default function OneOnOneWaiting() {
  const router = useRouter()
  const [user, setUser] = useState<WaitingUser | null>(null)
  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [countdown, setCountdown] = useState<number>(5)

  // 세션 ID 생성
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
  }, [])

  // 대기열 입장
  useEffect(() => {
    if (!sessionId) return

    const joinQueue = async () => {
      try {
        const response = await fetch('/api/waiting/1on1/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId })
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setLoading(false)
        } else {
          console.error('대기열 입장 실패')
          setLoading(false)
        }
      } catch (error) {
        console.error('대기열 입장 중 오류:', error)
        setLoading(false)
      }
    }

    joinQueue()
  }, [sessionId])

  // 실시간 상태 업데이트 (2초마다)
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        // 매칭 상태 확인
        const matchResponse = await fetch(`/api/waiting/1on1/check-match?sessionId=${sessionId}`)
        if (matchResponse.ok) {
          const matchData = await matchResponse.json()
          if (matchData.isMatched) {
            setMatchedUser({
              isMatched: true,
              roomId: matchData.roomId,
              tag: matchData.tag,
              playerId: matchData.playerId
            })
            setUser(null)
            
            // 5초 카운트다운 시작
            setCountdown(5)
            const countdownInterval = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval)
                  // 채팅방으로 자동 이동 (setTimeout으로 렌더링 완료 후 실행)
                  setTimeout(() => {
                    router.push(`/chatroom?roomId=${matchData.roomId}&playerId=${matchData.playerId || 0}`)
                  }, 100)
                  return 0
                }
                return prev - 1
              })
            }, 1000)
            
            return
          }
        }

        // 대기열 상태 확인
        const statusResponse = await fetch(`/api/waiting/1on1/status?sessionId=${sessionId}`)
        
        if (statusResponse.ok) {
          const data = await statusResponse.json()
          setUser(data.user)
          setMatchedUser(null)
          
          // 남은 대기시간 계산
          if (data.user.joinedAt) {
            const joinedTime = new Date(data.user.joinedAt).getTime()
            const now = new Date().getTime()
            const elapsed = now - joinedTime
            const remaining = Math.max(0, 60000 - elapsed) // 1분 = 60000ms
            setRemainingTime(Math.ceil(remaining / 1000))
          }
          
          // 자동 매칭 실행 (대기열에 1명 이상 있을 때)
          if (data.user.queueLength >= 1) {
            try {
              const matchResponse = await fetch('/api/waiting/1on1/auto-match', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              })
              if (matchResponse.ok) {
                const matchData = await matchResponse.json()
                console.log('자동 매칭 결과:', matchData)
              }
            } catch (error) {
              console.error('자동 매칭 실행 오류:', error)
            }
          }
        } else if (statusResponse.status === 404) {
          // 사용자가 대기열에서 제거됨 (매칭 완료 등)
          console.log('대기열에서 제거됨')
        }
      } catch (error) {
        console.error('상태 업데이트 오류:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId])

  // 페이지 이탈 시 대기열에서 제거
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (sessionId) {
        try {
          await fetch('/api/waiting/1on1/join', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
          })
        } catch (error) {
          console.error('대기열 퇴장 처리 오류:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionId])

  const handleGoBack = async () => {
    // 대기열에서 제거
    if (sessionId) {
      try {
        await fetch('/api/waiting/1on1/join', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId })
        })
      } catch (error) {
        console.error('대기열 퇴장 처리 오류:', error)
      }
    }
    
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dark-accent mx-auto mb-4"></div>
          <p className="text-dark-text-secondary">대기열에 입장하는 중...</p>
        </div>
      </div>
    )
  }

  // 매칭 완료 상태
  if (matchedUser) {
    return (
      <div className="min-h-screen bg-dark-bg">
        {/* 상단바 */}
        <div className="bg-dark-card border-b border-dark-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleGoBack}
                className="flex items-center text-dark-text-secondary hover:text-dark-accent transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                나가기
              </button>
              <h1 className="text-xl font-semibold text-dark-text">매칭 완료</h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        {/* 매칭 완료 콘텐츠 */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="space-y-6">
              {/* 성공 아이콘 */}
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* 매칭 완료 정보 */}
              <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
                <h2 className="text-2xl font-bold text-green-400 mb-4">
                  매칭 완료!
                </h2>
                <p className="text-dark-text-secondary mb-4">
                  당신은 매치메이킹 되었습니다.
                </p>
                
                <div className="bg-dark-bg rounded-lg p-4 mb-4">
                  <p className="text-sm text-dark-text-secondary mb-1">방번호</p>
                  <p className="text-lg font-mono text-dark-accent">
                    {matchedUser.roomId}
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-2 mb-4">
                  <span className="text-dark-text-secondary">당신의 태그:</span>
                  <span className={`px-3 py-1 rounded-full text-lg font-bold ${
                    matchedUser.tag === 'A' ? 'bg-red-500/20 text-red-400' :
                    matchedUser.tag === 'B' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {matchedUser.tag}태그
                  </span>
                </div>

                {/* 자동 입장 카운트다운 */}
                <div className="bg-dark-bg rounded-lg p-4 text-center">
                  <p className="text-dark-text-secondary mb-2">
                    채팅방으로 자동 입장합니다
                  </p>
                  <div className="text-3xl font-bold text-dark-accent">
                    {countdown}
                  </div>
                  <p className="text-sm text-dark-text-secondary mt-1">
                    초 후 입장
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">대기열 입장에 실패했습니다.</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-dark-accent text-white rounded-lg hover:bg-dark-accent/80 transition-colors"
          >
            메인 화면으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* 상단바 */}
      <div className="bg-dark-card border-b border-dark-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="flex items-center text-dark-text-secondary hover:text-dark-accent transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              나가기
            </button>
            <h1 className="text-xl font-semibold text-dark-text">1:1 대기방</h1>
            <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          {/* 로딩 애니메이션 */}
          <div className="mb-8">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-dark-border"></div>
              <div className="absolute inset-0 rounded-full border-4 border-dark-accent border-t-transparent animate-spin"></div>
            </div>
          </div>

          {/* 대기 상태 정보 */}
          <div className="space-y-6">
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <h2 className="text-2xl font-bold text-dark-text mb-2">
                상대를 찾는 중
              </h2>
              <p className="text-dark-text-secondary">
                매칭을 위해 잠시만 기다려주세요...
              </p>
            </div>

            {/* 순서 정보 */}
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <div className="text-3xl font-bold text-dark-accent mb-2">
                {user.position}번째
              </div>
              <p className="text-dark-text-secondary mb-4">
                당신은 {user.position}번째 순서입니다.
              </p>
              
              {/* 태그 정보 */}
              <div className="flex items-center justify-center space-x-2">
                <span className="text-dark-text-secondary">당신은</span>
                <span className={`px-3 py-1 rounded-full text-lg font-bold ${
                  user.tag === 'A' ? 'bg-red-500/20 text-red-400' :
                  user.tag === 'B' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {user.tag}태그
                </span>
                <span className="text-dark-text-secondary">입니다.</span>
              </div>
            </div>

            {/* 대기열 정보 */}
            <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
              <p className="text-sm text-dark-text-secondary mb-2">
                현재 대기 중인 사용자: {user.queueLength}명
              </p>
              {remainingTime > 0 && (
                <p className="text-sm text-yellow-400">
                  {remainingTime}초 후 홀로 매칭 가능
                </p>
              )}
              {remainingTime === 0 && (user.tag === 'A' || user.tag === 'B') && (
                <p className="text-sm text-green-400">
                  홀로 매칭 가능 (AI와 대화)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
