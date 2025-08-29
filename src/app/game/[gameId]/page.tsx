'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

interface GameMessage {
  id: string
  content: string
  createdAt: string
  player: {
    id: string
    label: string
    color: string
    isAi: boolean
  }
}

interface Player {
  id: string
  label: string
  color: string
  isAi: boolean
  turnOrder: number
  status: string
  isCurrentPlayer: boolean
}

interface GameData {
  game: {
    id: string
    status: string
    topic: string
    expiresAt: string
    createdAt: string
  }
  players: Player[]
  messages: GameMessage[]
  currentPlayer: {
    id: string
    label: string
    color: string
    isAi: boolean
    turnOrder: number
  }
}

function GamePageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params.gameId as string
  const sessionId = searchParams.get('sessionId')
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchGameStatus = useCallback(async () => {
    if (!sessionId) {
      setError('세션 ID가 없습니다.')
      return
    }

    try {
      console.log('Fetching game status:', { gameId, sessionId })
      const response = await fetch(`/api/game/${gameId}/status?sessionId=${sessionId}`)
      
      console.log('Game status response:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText 
      })
      
      if (!response.ok) {
        // 응답 텍스트를 먼저 확인
        const responseText = await response.text()
        console.log('Response text:', responseText)
        
        let errorData: { error?: string } = {}
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: responseText || 'Unknown error' }
        }
        
        console.error('Game status error:', { 
          status: response.status, 
          error: errorData,
          statusText: response.statusText,
          responseText: responseText
        })
        
        if (response.status === 404) {
          setError('게임을 찾을 수 없습니다.')
          return
        } else if (response.status === 403) {
          const errorMessage = errorData.error || '이 게임에 참여할 권한이 없습니다.'
          console.log('403 Error message:', errorMessage)
          
          // 게임이 이미 진행 중인 경우 자동으로 새로운 게임 시작
          if (errorMessage.includes('이미 진행 중')) {
            console.log('Game is already in progress, redirecting to new game')
            router.push('/')
            return
          }
          
          setError(errorMessage)
          return
        } else if (response.status === 500) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
          return
        }
        
        // 기타 오류의 경우
        const errorMessage = errorData.error || `오류가 발생했습니다. (${response.status})`
        setError(errorMessage)
        return
      }
      
      // 성공 응답도 텍스트로 먼저 확인
      const responseText = await response.text()
      console.log('Success response text:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError)
        throw new Error('Invalid JSON response from server')
      }
      
      console.log('Game status data received:', data)
      setGameData(data)
      setError('')
    } catch (error) {
      console.error('Error fetching game status:', error)
      setError('게임 상태를 불러오는 중 오류가 발생했습니다.')
    }
  }, [gameId, sessionId])

  useEffect(() => {
    if (sessionId && gameId) {
      fetchGameStatus()
      // 실시간 업데이트를 위한 폴링 (5초마다)
      const interval = setInterval(fetchGameStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [sessionId, gameId, fetchGameStatus])

  useEffect(() => {
    // 메시지가 추가되면 자동 스크롤
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameData?.messages])

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || isLoading || !sessionId) return

    const message = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/game/${gameId}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          content: message
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // 메시지 전송 후 게임 상태 새로고침
      await fetchGameStatus()
    } catch (error) {
      console.error('Error sending message:', error)
      setError('메시지 전송 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
            <div className="space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                메인으로 돌아가기
              </button>
              {error.includes('이미 진행 중') && (
                <button
                  onClick={async () => {
                    try {
                      // 새로운 세션 ID 생성
                      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      
                      // 새로운 게임 매칭 요청
                      const response = await fetch('/api/matchmaking/join-1v1', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ sessionId: newSessionId })
                      })

                      if (!response.ok) {
                        throw new Error('매칭 서버에 연결할 수 없습니다.')
                      }

                      const data = await response.json()
                      
                      if (data.isMatched && data.gameId) {
                        // 즉시 매칭된 경우 새 게임 페이지로 이동
                        router.push(`/game/${data.gameId}?sessionId=${newSessionId}`)
                      } else {
                        // 매칭 대기 중인 경우 대기화면으로 이동
                        router.push(`/waiting?sessionId=${newSessionId}&gameType=1v1`)
                      }
                    } catch (error) {
                      console.error('New game error:', error)
                      router.push('/')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  새로운 게임 시작
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!gameData) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">게임 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            뒤로가기
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {gameData.game.topic}
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {gameData.players.length}명 참여
            </span>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {gameData.messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>대화를 시작해보세요!</p>
          </div>
        ) : (
          gameData.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.player.isAi ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.player.isAi
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: message.player.color }}
                  >
                    {message.player.label}
                  </span>
                  {message.player.isAi && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      AI
                    </span>
                  )}
                </div>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || inputMessage.trim() === ''}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
          >
            {isLoading ? '전송 중...' : '전송'}
          </button>
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

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GamePageContent />
    </Suspense>
  )
}
