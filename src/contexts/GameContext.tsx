'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef, useCallback } from 'react'
import { GameType, GameStatus, PlayerLabel } from '@/types/game'
import { RealtimeChannel } from '@supabase/supabase-js'
import { 
  subscribeToGameChannel, 
  unsubscribeFromGameChannel,
  RealtimeMessage,
  TurnChangeEvent,
  PlayerEvent,
  VoteEvent,
  GameStatusEvent,
  TopicChangeEvent
} from '@/lib/realtime'
import { sendMessageToGame, submitVoteToGame } from '@/lib/game-api'
import { handleMessageSend, handleVoteSubmit, formatErrorMessage } from '@/lib/input-handlers'
import { startHeartbeat, stopHeartbeat, setupBrowserEventListeners, setupAutoReconnect, cleanupAllHeartbeats } from '@/lib/player-disconnect-client'

// 게임 상태 타입 정의
interface GameState {
  // 게임 기본 정보
  gameId: string | null
  gameType: GameType
  gameStatus: GameStatus
  currentTopic: string
  
  // 시간 관련
  timeRemaining: number
  turnTimeRemaining: number
  
  // 플레이어 관련
  players: Player[]
  myPlayerLabel: PlayerLabel | null
  currentTurn: PlayerLabel | null
  
  // 메시지 관련
  messages: Message[]
  
  // 투표 관련
  voteCount: number
  totalPlayers: number
  hasVoted: boolean
  myVote: string[]
  isVotePrepared: boolean
  
  // UI 상태
  isVoteModalOpen: boolean
  isResultsScreenVisible: boolean
}

// 플레이어 타입
interface Player {
  label: PlayerLabel
  color: string
  name: string
  isAI: boolean
  isActive: boolean
  hasVoted: boolean
  personaId?: number // AI 플레이어의 경우 페르소나 ID
}

// 메시지 타입
interface Message {
  id: string
  playerLabel: PlayerLabel
  playerColor: string
  content: string
  isMyMessage: boolean
  timestamp: string
  isSystemMessage?: boolean
}

// 액션 타입들
type GameAction =
  | { type: 'SET_GAME_ID'; payload: string }
  | { type: 'SET_GAME_TYPE'; payload: GameType }
  | { type: 'SET_GAME_STATUS'; payload: GameStatus }
  | { type: 'SET_CURRENT_TOPIC'; payload: string }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'SET_TURN_TIME_REMAINING'; payload: number }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'SET_MY_PLAYER_LABEL'; payload: PlayerLabel }
  | { type: 'SET_CURRENT_TURN'; payload: PlayerLabel | null }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_VOTE_COUNT'; payload: number }
  | { type: 'SET_TOTAL_PLAYERS'; payload: number }
  | { type: 'SET_HAS_VOTED'; payload: boolean }
  | { type: 'SET_MY_VOTE'; payload: string[] }
  | { type: 'SET_VOTE_PREPARED'; payload: boolean }
  | { type: 'SET_VOTE_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_RESULTS_SCREEN_VISIBLE'; payload: boolean }
  | { type: 'UPDATE_PLAYER_STATUS'; payload: { label: PlayerLabel; updates: Partial<Player> } }
  | { type: 'RESET_GAME' }

// 초기 상태
const initialState: GameState = {
  gameId: null,
  gameType: '1v1',
  gameStatus: 'waiting',
  currentTopic: '오늘 날씨가 정말 좋네요!',
  timeRemaining: 120, // 2분 (1:1 게임 기준)
  turnTimeRemaining: 20, // 20초 턴 제한
  players: [],
  myPlayerLabel: null,
  currentTurn: null,
  messages: [],
  voteCount: 0,
  totalPlayers: 0,
  hasVoted: false,
  myVote: [],
  isVotePrepared: false,
  isVoteModalOpen: false,
  isResultsScreenVisible: false
}

// 리듀서 함수
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME_ID':
      return { ...state, gameId: action.payload }
    
    case 'SET_GAME_TYPE':
      return { ...state, gameType: action.payload }
    
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.payload }
    
    case 'SET_CURRENT_TOPIC':
      return { ...state, currentTopic: action.payload }
    
    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload }
    
    case 'SET_TURN_TIME_REMAINING':
      return { ...state, turnTimeRemaining: action.payload }
    
    case 'SET_PLAYERS':
      return { ...state, players: action.payload, totalPlayers: action.payload.length }
    
    case 'SET_MY_PLAYER_LABEL':
      return { ...state, myPlayerLabel: action.payload }
    
    case 'SET_CURRENT_TURN':
      return { ...state, currentTurn: action.payload }
    
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload }
    
    case 'SET_VOTE_COUNT':
      return { ...state, voteCount: action.payload }
    
    case 'SET_TOTAL_PLAYERS':
      return { ...state, totalPlayers: action.payload }
    
    case 'SET_HAS_VOTED':
      return { ...state, hasVoted: action.payload }
    
    case 'SET_MY_VOTE':
      return { ...state, myVote: action.payload }
    
    case 'SET_VOTE_PREPARED':
      return { ...state, isVotePrepared: action.payload }
    
    case 'SET_VOTE_MODAL_OPEN':
      return { ...state, isVoteModalOpen: action.payload }
    
    case 'SET_RESULTS_SCREEN_VISIBLE':
      return { ...state, isResultsScreenVisible: action.payload }
    
    case 'UPDATE_PLAYER_STATUS':
      return {
        ...state,
        players: state.players.map(player =>
          player.label === action.payload.label
            ? { ...player, ...action.payload.updates }
            : player
        )
      }
    
    case 'RESET_GAME':
      return initialState
    
    default:
      return state
  }
}

// Context 생성
interface GameContextType {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  // 편의 함수들
  sendMessage: (content: string) => Promise<any>
  submitVote: (voteData: string[] | { playerLabel: string; voteType: 'ai' | 'human' }) => Promise<any>
  prepareVote: () => void
  openVoteModal: () => Promise<any>
  closeVoteModal: () => void
  showResults: () => void
  resetGame: () => void
  isMyTurn: () => boolean
  canVote: () => boolean
  // 실시간 구독 함수들
  subscribeToGame: (gameId: string) => void
  unsubscribeFromGame: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

// Provider 컴포넌트
interface GameProviderProps {
  children: ReactNode
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  
  // 플레이어 이탈 처리 관련 refs
  const heartbeatRef = useRef<{ gameId: string; playerLabel: PlayerLabel } | null>(null)
  const browserEventCleanupRef = useRef<(() => void) | null>(null)
  const autoReconnectCleanupRef = useRef<(() => void) | null>(null)

  // 편의 함수들
  const sendMessage = async (content: string) => {
    if (!state.myPlayerLabel || !state.gameId) return

    // 로컬에 메시지 추가 (즉시 UI 업데이트)
    const newMessage: Message = {
      id: Date.now().toString(),
      playerLabel: state.myPlayerLabel!,
      playerColor: state.players.find(p => p.label === state.myPlayerLabel)?.color || 'bg-blue-500',
      content,
      isMyMessage: true,
      timestamp: '방금 전'
    }
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage })

    // 턴 타이머 리셋 (매 채팅마다 20초로 리셋)
    dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: 20 })

    // 턴을 AI로 변경
    const nextPlayer = state.players.find(p => p.label !== state.myPlayerLabel)
    if (nextPlayer) {
      console.log('Changing turn to AI player:', nextPlayer.label)
      dispatch({ type: 'SET_CURRENT_TURN', payload: nextPlayer.label })
      
      // AI 턴 시뮬레이션 (2초 후)
      setTimeout(() => {
        console.log('Starting AI turn simulation for:', nextPlayer.label)
        simulateAITurn(nextPlayer.label)
      }, 2000)
    }

    return { success: true }
  }

  const simulateAITurn = async (aiPlayerLabel: PlayerLabel) => {
    console.log('Generating AI turn with OpenAI API for:', aiPlayerLabel)
    
    try {
      // AI 플레이어 정보 찾기
      const aiPlayer = state.players.find(p => p.label === aiPlayerLabel)
      if (!aiPlayer) {
        console.error('AI player not found:', aiPlayerLabel)
        return
      }

      // 대화 히스토리 준비 (최근 10개 메시지)
      const conversationHistory = state.messages
        .slice(-10)
        .map(msg => ({
          playerLabel: msg.playerLabel,
          content: msg.content,
          timestamp: msg.timestamp
        }))

      // AI 턴 API 호출
      const response = await fetch('/api/ai/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: state.gameId,
          playerLabel: aiPlayerLabel,
          personaId: aiPlayer.personaId || 1, // 기본 페르소나 ID
          gameType: state.gameType,
          currentTopic: state.currentTopic,
          conversationHistory,
          turnTimeRemaining: state.turnTimeRemaining,
          gameStatus: state.gameStatus,
          voteCount: state.voteCount,
          totalPlayers: state.totalPlayers,
          timeRemaining: state.timeRemaining,
          currentTurn: state.currentTurn,
          players: state.players
        })
      })

      if (!response.ok) {
        throw new Error(`AI turn API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.actions && result.actions.length > 0) {
        // AI 응답 메시지 추가
        const aiMessage: Message = {
          id: Date.now().toString(),
          playerLabel: aiPlayerLabel,
          playerColor: aiPlayer.color,
          content: result.actions[0].content || '안녕하세요!',
          isMyMessage: false,
          timestamp: '방금 전'
        }
        
        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
        
        console.log('AI response generated successfully:', result.actions[0].content)
      } else {
        console.error('AI turn failed:', result.error)
        // 실패 시 기본 메시지
        const fallbackMessage: Message = {
          id: Date.now().toString(),
          playerLabel: aiPlayerLabel,
          playerColor: aiPlayer.color,
          content: '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
          isMyMessage: false,
          timestamp: '방금 전'
        }
        dispatch({ type: 'ADD_MESSAGE', payload: fallbackMessage })
      }
      
      // 턴을 다시 사람 플레이어로 변경
      setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_TURN', payload: state.myPlayerLabel! })
        // 사람 턴으로 돌아올 때 타이머 리셋
        dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: 20 })
      }, 1000)
      
    } catch (error) {
      console.error('Error generating AI turn:', error)
      
      // 에러 시 기본 메시지
      const aiPlayer = state.players.find(p => p.label === aiPlayerLabel)
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        playerLabel: aiPlayerLabel,
        playerColor: aiPlayer?.color || 'bg-red-500',
        content: '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
        isMyMessage: false,
        timestamp: '방금 전'
      }
      dispatch({ type: 'ADD_MESSAGE', payload: fallbackMessage })
      
      // 턴을 다시 사람 플레이어로 변경
      setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_TURN', payload: state.myPlayerLabel! })
        dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: 20 })
      }, 1000)
    }
  }

  const submitVote = async (voteData: string[] | { playerLabel: string; voteType: 'ai' | 'human' }) => {
    if (!state.myPlayerLabel || !state.gameId) return

    // 1:1 게임에서는 AI/Human 선택, 1:N 게임에서는 플레이어 선택
    let selectedPlayers: string[]
    let voteType: 'ai' | 'human' | undefined

    if (state.gameType === '1v1' && typeof voteData === 'object' && 'voteType' in voteData) {
      selectedPlayers = [voteData.playerLabel]
      voteType = voteData.voteType
    } else if (Array.isArray(voteData)) {
      selectedPlayers = voteData
    } else {
      console.error('Invalid vote data format')
      return
    }

    const result = await handleVoteSubmit(
      selectedPlayers,
      state.gameId,
      state.myPlayerLabel,
      state.gameType,
      voteType,
      // 성공 콜백
      () => {
        console.log('Vote submitted successfully')
        // 로컬 상태 업데이트
        dispatch({ type: 'SET_MY_VOTE', payload: selectedPlayers })
        dispatch({ type: 'SET_HAS_VOTED', payload: true })
        dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: false })
      },
      // 에러 콜백
      (error) => {
        console.error('Vote submit error:', error)
        // 에러 처리: 로컬 상태만 업데이트
        dispatch({ type: 'SET_MY_VOTE', payload: selectedPlayers })
        dispatch({ type: 'SET_HAS_VOTED', payload: true })
        dispatch({ type: 'SET_VOTE_COUNT', payload: state.voteCount + 1 })
        dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: false })
      }
    )

    return result
  }

  // 투표 준비 신호 보내기/취소하기
  const prepareVote = () => {
    if (!state.myPlayerLabel || state.hasVoted || state.isVoteModalOpen) return
    
    if (state.isVotePrepared) {
      // 투표 준비 취소
      dispatch({ type: 'SET_VOTE_PREPARED', payload: false })
      dispatch({ type: 'SET_VOTE_COUNT', payload: Math.max(0, state.voteCount - 1) })
    } else {
      // 투표 준비 상태로 변경
      dispatch({ type: 'SET_VOTE_PREPARED', payload: true })
      dispatch({ type: 'SET_VOTE_COUNT', payload: state.voteCount + 1 })
      
      // 모든 플레이어가 투표 준비를 완료했는지 확인
      if (state.voteCount + 1 >= state.totalPlayers) {
        console.log('All players prepared for voting, starting voting phase')
        // 게임 상태를 voting으로 변경하고 투표 모달 열기
        dispatch({ type: 'SET_GAME_STATUS', payload: 'voting' })
        dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: true })
      }
    }
  }

  const openVoteModal = () => {
    dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: true })
  }

  const closeVoteModal = () => {
    dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: false })
  }

  const showResults = () => {
    dispatch({ type: 'SET_RESULTS_SCREEN_VISIBLE', payload: true })
  }

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' })
  }

  // 투표 모달 열기 (Promise 래퍼)
  const handleVoteModalOpen = async () => {
    openVoteModal()
    return { success: true }
  }

  const isMyTurn = () => {
    return state.currentTurn === state.myPlayerLabel
  }

  const canVote = () => {
    return !state.hasVoted && state.gameStatus === 'active'
  }

  // 실시간 구독 함수들
  const subscribeToGame = useCallback((gameId: string) => {
    // 기존 구독 해제
    if (realtimeChannelRef.current) {
      unsubscribeFromGameChannel(realtimeChannelRef.current)
    }

    // 새로운 게임 구독
    realtimeChannelRef.current = subscribeToGameChannel(gameId, {
      onNewMessage: (message: RealtimeMessage) => {
        // 메시지를 게임 상태에 맞게 변환
        const player = state.players.find(p => p.label === message.player_id)
        if (player) {
          const newMessage = {
            id: message.id,
            playerLabel: message.player_id as PlayerLabel,
            playerColor: player.color,
            content: message.content,
            isMyMessage: message.player_id === state.myPlayerLabel,
            timestamp: new Date(message.created_at).toLocaleTimeString()
          }
          dispatch({ type: 'ADD_MESSAGE', payload: newMessage })
        }
      },

      onTurnChange: (event: TurnChangeEvent) => {
        dispatch({ type: 'SET_CURRENT_TURN', payload: event.current_turn as PlayerLabel })
        dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: event.turn_time_remaining })
      },

      onPlayerJoined: (event: PlayerEvent) => {
        const newPlayer = {
          label: event.player_label as PlayerLabel,
          color: event.player_color,
          name: `Player ${event.player_label}`,
          isAI: event.is_ai,
          isActive: true,
          hasVoted: false
        }
        dispatch({ type: 'SET_PLAYERS', payload: [...state.players, newPlayer] })
      },

      onPlayerLeft: (event: PlayerEvent) => {
        dispatch({
          type: 'UPDATE_PLAYER_STATUS',
          payload: {
            label: event.player_label as PlayerLabel,
            updates: { isActive: false }
          }
        })

        // 시스템 메시지 추가
        const systemMessage = {
          id: Date.now().toString(),
          playerLabel: 'A' as PlayerLabel,
          playerColor: 'bg-gray-500',
          content: `Player ${event.player_label} has left the Game. Still, Player ${event.player_label} might be human or AI`,
          isMyMessage: false,
          timestamp: '방금 전',
          isSystemMessage: true
        }
        dispatch({ type: 'ADD_MESSAGE', payload: systemMessage })
      },

      onVoteSubmitted: (event: VoteEvent) => {
        dispatch({ type: 'SET_VOTE_COUNT', payload: state.voteCount + 1 })
      },

      onGameStatusChange: (event: GameStatusEvent) => {
        dispatch({ type: 'SET_GAME_STATUS', payload: event.status })
        dispatch({ type: 'SET_TIME_REMAINING', payload: event.time_remaining })
      },

      onTopicChange: (event: TopicChangeEvent) => {
        dispatch({ type: 'SET_CURRENT_TOPIC', payload: event.topic_content })
      }
    })

    // 플레이어 이탈 처리 설정
    if (state.myPlayerLabel) {
      // 하트비트 시작
      startHeartbeat(gameId, state.myPlayerLabel)
      heartbeatRef.current = { gameId, playerLabel: state.myPlayerLabel }
      
      // 브라우저 이벤트 리스너 설정
      browserEventCleanupRef.current = setupBrowserEventListeners(gameId, state.myPlayerLabel)
      
      // 자동 재연결 설정
      autoReconnectCleanupRef.current = setupAutoReconnect(
        gameId,
        state.myPlayerLabel,
        (response) => {
          console.log('Auto-reconnect successful:', response)
          // 재연결 성공 시 게임 상태 새로고침
          // TODO: 게임 상태 새로고침 로직 추가
        },
        (error) => {
          console.error('Auto-reconnect failed:', error)
          // 재연결 실패 시 사용자에게 알림
        }
      )
    }
  }, [dispatch, state.players, state.voteCount, state.myPlayerLabel])

  const unsubscribeFromGame = useCallback(() => {
    if (realtimeChannelRef.current) {
      unsubscribeFromGameChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    
    // 플레이어 이탈 처리 정리
    if (heartbeatRef.current) {
      stopHeartbeat(heartbeatRef.current.gameId, heartbeatRef.current.playerLabel)
      heartbeatRef.current = null
    }
    
    if (browserEventCleanupRef.current) {
      browserEventCleanupRef.current()
      browserEventCleanupRef.current = null
    }
    
    if (autoReconnectCleanupRef.current) {
      autoReconnectCleanupRef.current()
      autoReconnectCleanupRef.current = null
    }
  }, [])

  // 타이머 효과 (게임 시간)
  useEffect(() => {
    if (state.gameStatus !== 'active' || state.timeRemaining <= 0) return

    const timer = setInterval(() => {
      dispatch({ type: 'SET_TIME_REMAINING', payload: state.timeRemaining - 1 })
    }, 1000)

    return () => clearInterval(timer)
  }, [state.gameStatus, state.timeRemaining])

  // 게임 시간이 끝나면 게임 종료하고 투표 시작
  useEffect(() => {
    if (state.gameStatus === 'active' && state.timeRemaining === 0) {
      console.log('Game time expired, starting voting phase')
      dispatch({ type: 'SET_GAME_STATUS', payload: 'voting' })
      dispatch({ type: 'SET_VOTE_MODAL_OPEN', payload: true })
    }
  }, [state.gameStatus, state.timeRemaining])

  // 턴 타이머 효과
  useEffect(() => {
    if (state.gameStatus !== 'active' || !isMyTurn() || state.turnTimeRemaining <= 0) return

    const timer = setInterval(() => {
      dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: state.turnTimeRemaining - 1 })
    }, 1000)

    return () => clearInterval(timer)
  }, [state.gameStatus, state.currentTurn, state.turnTimeRemaining])

  // 시간이 다 되면 자동으로 "Skipped" 메시지 전송
  useEffect(() => {
    if (state.turnTimeRemaining === 0 && isMyTurn()) {
      sendMessage('Skipped')
      dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: 20 })
    }
  }, [state.turnTimeRemaining])

  // 컴포넌트 언마운트 시 구독 해제
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        unsubscribeFromGameChannel(realtimeChannelRef.current)
      }
      
      // 플레이어 이탈 처리 정리
      cleanupAllHeartbeats()
      
      if (browserEventCleanupRef.current) {
        browserEventCleanupRef.current()
      }
      
      if (autoReconnectCleanupRef.current) {
        autoReconnectCleanupRef.current()
      }
    }
  }, [])

  const contextValue: GameContextType = {
    state,
    dispatch,
    sendMessage,
    submitVote,
    prepareVote,
    openVoteModal: handleVoteModalOpen,
    closeVoteModal,
    showResults,
    resetGame,
    isMyTurn,
    canVote,
    subscribeToGame,
    unsubscribeFromGame
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

// Hook
export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
