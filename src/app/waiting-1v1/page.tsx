'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export default function Waiting1v1Page() {
  const router = useRouter()
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [isMatched, setIsMatched] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // 1:1 매치메이킹 큐에 참가
    join1v1Queue()
    
    // 매칭 상태 폴링
    const interval = setInterval(() => {
      if (sessionId) {
        checkMatchingStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId])

  const join1v1Queue = async () => {
    try {
      const response = await fetch('/api/matchmaking/1v1/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setQueuePosition(data.position)
        setSessionId(data.sessionId)
        console.log('1:1 큐 참가 성공:', data)
      }
    } catch (error) {
      console.error('1:1 큐 참가 오류:', error)
    }
  }

  const checkMatchingStatus = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/matchmaking/1v1/status?sessionId=${sessionId}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.matched && data.roomId) {
          setIsMatched(true)
          // 매칭 완료 시 채팅방으로 이동
          router.push(`/chatroom?roomId=${data.roomId}&playerId=${data.playerId}`)
        } else {
          setQueuePosition(data.position)
        }
      }
    } catch (error) {
      console.error('매칭 상태 확인 오류:', error)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col items-center justify-center p-4">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 flex items-center text-dark-text-secondary hover:text-dark-accent transition-colors duration-200"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
        뒤로가기
      </button>

      <div className="flex flex-col items-center justify-center space-y-6">
        {/* 로딩 애니메이션 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-dark-border border-t-dark-accent animate-spin"></div>
        </div>

        {/* 메인 텍스트 */}
        <h1 className="text-2xl font-semibold text-dark-text">1:1 상대를 찾는중</h1>

        {/* 큐 위치 표시 */}
        {queuePosition !== null && (
          <div className="text-dark-text-secondary text-sm">
            대기 순서: {queuePosition}번째
          </div>
        )}

        {/* 부가 설명 */}
        <p className="text-dark-text-secondary text-sm text-center">
          1:1 대화를 위한 매칭을 진행하고 있습니다.<br />
          잠시만 기다려주세요...
        </p>

        {/* 매칭 완료 메시지 */}
        {isMatched && (
          <div className="text-dark-accent text-sm">
            매칭 완료! 채팅방으로 이동합니다...
          </div>
        )}
      </div>
    </div>
  )
}
