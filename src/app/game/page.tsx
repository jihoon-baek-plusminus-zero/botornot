'use client'

import { useEffect, useState } from 'react'
import { Vote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Header, ChatWindow, MessageInput, VoteModal, ResultsScreen, PlayerList, ToastContainer } from '@/components'
import { useGame } from '@/contexts/GameContext'
import { Player, Message } from '@/types/game'

// 빈 배열들 (실제 게임에서는 서버에서 로드됨)
const samplePlayers: Player[] = []
const sampleMessages: Message[] = []

export default function GamePage() {
  const { 
    state, 
    dispatch, 
    sendMessage, 
    submitVote, 
    openVoteModal, 
    closeVoteModal, 
    showResults, 
    resetGame,
    isMyTurn,
    canVote,
    subscribeToGame,
    unsubscribeFromGame
  } = useGame()
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info'; duration?: number }>>([])

  // 컴포넌트 마운트 시 실시간 구독
  useEffect(() => {
    // URL에서 게임 ID 가져오기 (실제로는 매치메이킹 후 설정됨)
    const urlParams = new URLSearchParams(window.location.search)
    const gameId = urlParams.get('gameId') || 'temp-game-123'
    
    dispatch({ type: 'SET_GAME_ID', payload: gameId })
    subscribeToGame(gameId)

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribeFromGame()
    }
  }, [dispatch])

  // 이벤트 핸들러들
  const handleBackToLobby = () => {
    window.location.href = '/'
  }

  const handleStartTestGame = async () => {
    try {
      // 테스트용 게임 데이터 설정
      const testPlayers = [
        { label: 'A' as const, color: 'bg-red-500', name: 'AI Player', isAI: true, isActive: true, hasVoted: false },
        { label: 'B' as const, color: 'bg-blue-500', name: 'Human Player', isAI: false, isActive: true, hasVoted: false }
      ]
      
      dispatch({ type: 'SET_PLAYERS', payload: testPlayers })
      dispatch({ type: 'SET_MY_PLAYER_LABEL', payload: 'B' })
      dispatch({ type: 'SET_CURRENT_TURN', payload: 'A' })
      dispatch({ type: 'SET_GAME_STATUS', payload: 'active' })
      dispatch({ type: 'SET_GAME_TYPE', payload: '1v1' })
      dispatch({ type: 'SET_CURRENT_TOPIC', payload: '오늘 날씨가 정말 좋네요!' })
      
      addToast('테스트 게임이 시작되었습니다!', 'success')
      
      // AI 첫 턴 시뮬레이션 (3초 후)
      console.log('Starting AI first turn simulation...')
      setTimeout(() => {
        console.log('Adding AI first message...')
        const aiMessage = {
          id: Date.now().toString(),
          playerLabel: 'A' as const,
          playerColor: 'bg-red-500',
          content: '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
          isMyMessage: false,
          timestamp: '방금 전'
        }
        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
        
        // 턴을 B로 변경
        setTimeout(() => {
          console.log('Changing turn to B...')
          dispatch({ type: 'SET_CURRENT_TURN', payload: 'B' })
          addToast('당신의 턴입니다!', 'info')
        }, 1000)
      }, 3000)
    } catch (error) {
      console.error('Failed to start test game:', error)
      addToast('게임 시작에 실패했습니다.', 'error')
    }
  }



  const handleVoteClick = async () => {
    if (canVote()) {
      await openVoteModal()
    }
  }

  const handleVoteSubmit = (selectedPlayers: string[]) => {
    submitVote(selectedPlayers)
  }

  const handleBackToLobbyFromResults = () => {
    window.location.href = '/'
  }

  // 토스트 관련 함수들
  const addToast = (message: string, type: 'success' | 'error' | 'info', duration = 5000) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const handlePlayAgain = () => {
    resetGame()
    // TODO: 새 게임 시작 로직
  }

  // 결과 화면이 보여져야 하는지 확인
  if (state.isResultsScreenVisible) {
    return (
      <ResultsScreen
        gameType={state.gameType}
        players={state.players.map(p => ({ ...p, voteCount: 1 }))}
        myPlayerLabel={state.myPlayerLabel || 'B'}
        myVote={state.myVote}
        correctVote={true}
        onBackToLobby={handleBackToLobbyFromResults}
        onPlayAgain={handlePlayAgain}
      />
    )
  }

  // 게임이 시작되지 않은 경우 테스트 게임 시작 화면 표시
  if (state.gameStatus === 'waiting' || state.players.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 헤더 */}
        <Header
          timeRemaining={state.timeRemaining}
          turnTimeRemaining={state.turnTimeRemaining}
          gameType={state.gameType}
          currentTopic={state.currentTopic}
          voteCount={state.voteCount}
          totalPlayers={state.totalPlayers}
          currentTurn={state.currentTurn || undefined}
          myPlayerLabel={state.myPlayerLabel || undefined}
          onBackClick={handleBackToLobby}
        />

        {/* 게임 시작 화면 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              게임 대기 중
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              실제 매치메이킹을 기다리는 중입니다.
            </p>
            <button
              onClick={handleStartTestGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              테스트 게임 시작
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <Header
        timeRemaining={state.timeRemaining}
        turnTimeRemaining={state.turnTimeRemaining}
        gameType={state.gameType}
        currentTopic={state.currentTopic}
        voteCount={state.voteCount}
        totalPlayers={state.totalPlayers}
        currentTurn={state.currentTurn || undefined}
        myPlayerLabel={state.myPlayerLabel || undefined}
        onBackClick={handleBackToLobby}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 채팅창 */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            messages={state.messages}
            gameStatus={state.gameStatus}
            currentTurn={state.currentTurn || undefined}
            myPlayerLabel={state.myPlayerLabel || undefined}
          />
        </div>

        {/* 플레이어 목록 (데스크톱에서만 사이드바로 표시) */}
        <div className="hidden lg:block lg:w-64 lg:border-l lg:border-gray-200 lg:dark:border-gray-700">
          <PlayerList
            players={state.players}
            currentTurn={state.currentTurn || undefined}
            myPlayerLabel={state.myPlayerLabel || undefined}
          />
        </div>
      </div>

      {/* 입력창 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4">
        <div className="flex items-end space-x-2 sm:space-x-3">
          {/* 메시지 입력 */}
          <div className="flex-1 min-w-0">
            <MessageInput
              onSendMessage={sendMessage}
              onVote={handleVoteClick}
              placeholder="메시지를 입력하세요..."
              className="bg-transparent border-t-0 p-0"
              disabled={!isMyTurn()}
              isMyTurn={isMyTurn()}
              turnTimeRemaining={state.turnTimeRemaining}
            />
          </div>

          {/* Vote 버튼 */}
          <button
            onClick={handleVoteClick}
            disabled={!canVote()}
            className={cn(
              "px-3 sm:px-4 py-2 sm:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex-shrink-0",
              !canVote() && "opacity-50 cursor-not-allowed"
            )}
          >
            <Vote className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* 투표 모달 */}
      <VoteModal
        isOpen={state.isVoteModalOpen}
        onClose={closeVoteModal}
        onVote={handleVoteSubmit}
        gameType={state.gameType}
        players={state.players}
        timeRemaining={10}
        myPlayerLabel={state.myPlayerLabel || 'B'}
      />

      {/* 토스트 알림 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
