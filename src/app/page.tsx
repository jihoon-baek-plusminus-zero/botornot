'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Supabase connection error:', error.message)
        } else {
          console.log('Supabase connected successfully')
        }
      } catch (err) {
        console.error('Supabase connection failed:', err)
      }
    }

    checkConnection()
  }, [])

  const handleOneOnOneGame = async () => {
    // 1:1 게임 매칭 시스템
    try {
      // 세션 ID 생성
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 매칭 요청
      const response = await fetch('/api/matchmaking/join-1v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        throw new Error('매칭 서버에 연결할 수 없습니다.')
      }

      const data = await response.json()
      
      if (data.isMatched && data.gameId) {
        // 즉시 매칭된 경우 게임 페이지로 이동
        // 매칭 응답에서 받은 세션 ID 사용 (게임에 실제로 참여한 세션 ID)
        const gameSessionId = data.sessionId || sessionId
        router.push(`/game/${data.gameId}?sessionId=${gameSessionId}`)
      } else {
        // 매칭 대기 중인 경우 대기화면으로 이동
        router.push(`/waiting?sessionId=${sessionId}&gameType=1v1`)
      }

    } catch (error) {
      console.error('Game matching error:', error)
      alert('매칭 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleOneToManyGame = () => {
    // 1:N 게임 입장 기능 (추후 구현)
    console.log('1:N 게임 입장')
  }

  const handleAiChatting = () => {
    // AI Chatting 페이지로 이동
    router.push('/chat')
  }

  const handleStatus = () => {
    // Status 페이지로 이동
    router.push('/status')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              BotOrNot
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              게임에 입장하세요
            </p>
          </div>

          {/* 메인 게임 버튼들 */}
          <div className="space-y-6 mb-16">
            {/* AI Chatting 버튼 */}
            <button
              onClick={handleAiChatting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              AI Chatting
            </button>

            {/* 1:1 게임 입장 버튼 */}
            <button
              onClick={handleOneOnOneGame}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              1:1 게임 입장
            </button>

            {/* 1:N 게임 입장 버튼 */}
            <button
              onClick={handleOneToManyGame}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              1:N 게임 입장
            </button>
          </div>

          {/* Status 버튼 */}
          <div className="text-center">
            <button
              onClick={handleStatus}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors duration-200"
            >
              Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
