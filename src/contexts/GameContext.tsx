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
  turnTimeRemaining: 10, // 10초 턴 제한
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
  submitVote: (selectedPlayers: string[]) => Promise<any>
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

  const simulateAITurn = (aiPlayerLabel: PlayerLabel) => {
    console.log('Simulating AI turn for:', aiPlayerLabel)
    
    // 이전 메시지들 확인 (중복 방지)
    const recentMessages = state.messages.slice(-5).map(msg => msg.content)
    
    // AI 메시지 생성 (더 다양한 응답)
    const aiMessages = [
      // 인사 및 일반적인 대화
      '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
      '저는 집에서 영화를 보고 있어요. 어떤 영화를 좋아하시나요?',
      '저는 액션 영화를 좋아해요! 특히 마블 영화들이요.',
      '최근에 본 영화 중에 인상 깊었던 게 있나요?',
      '저는 어제 새로운 드라마를 봤는데 정말 재미있었어요!',
      '음악도 좋아하시나요? 어떤 장르를 선호하세요?',
      '여행 다니는 것도 좋아하시나요?',
      '요리나 베이킹에 관심이 있으시나요?',
      '운동이나 스포츠는 어떠세요?',
      '책 읽는 것도 좋아하시나요?',
      
      // 더 다양한 응답들
      '그렇군요! 저도 비슷한 취미가 있어요.',
      '정말 흥미롭네요. 더 자세히 들려주세요!',
      '와, 멋진 취미네요! 언제부터 시작하셨나요?',
      '저도 그런 것에 관심이 많아요.',
      '좋은 선택이네요! 저도 추천하고 싶은 게 있어요.',
      '그런 이야기 들으니까 저도 해보고 싶어지네요.',
      '정말 대단하시네요! 어떤 점이 가장 재미있으세요?',
      '저도 비슷한 경험이 있어요.',
      '그런 취미가 있다니 부럽네요!',
      '정말 멋진 관심사네요. 더 알려주세요!',
      
      // 질문형 응답들
      '그럼 평소에는 주로 뭐 하시나요?',
      '혹시 다른 취미도 있으시나요?',
      '언제부터 그런 관심을 가지게 되셨나요?',
      '가장 좋아하는 부분은 뭐인가요?',
      '그런 활동을 하면서 어떤 느낌을 받으시나요?',
      '혹시 추천하고 싶은 게 있으시나요?',
      '그런 것에 대해 더 알고 싶어요!',
      '어떤 점이 가장 재미있으신가요?',
      '그런 경험을 하면서 배운 게 있나요?',
      '앞으로는 어떤 계획이 있으시나요?',
      
      // 공감 및 반응
      '정말 공감이 가네요!',
      '저도 그런 생각을 해봤어요.',
      '정말 멋진 생각이에요!',
      '그런 관점이 흥미롭네요.',
      '저도 비슷한 경험을 했어요.',
      '정말 좋은 의견이네요!',
      '그런 생각을 하시다니 대단해요.',
      '저도 그런 느낌을 받은 적이 있어요.',
      '정말 흥미로운 이야기네요!',
      '그런 관점이 새롭네요.'
    ]
    
    // 대화 맥락 분석
    const lastHumanMessage = state.messages
      .filter(msg => msg.playerLabel !== aiPlayerLabel)
      .pop()?.content || ''
    
    // 맥락에 따른 응답 선택
    let selectedMessage = ''
    let attempts = 0
    const maxAttempts = 10
    
    // 마지막 사람 메시지에 따른 맥락적 응답
    if (lastHumanMessage.includes('책') || lastHumanMessage.includes('읽')) {
      const bookResponses = [
        '저도 책 읽는 걸 좋아해요! 어떤 장르를 선호하시나요?',
        '책 읽는 건 정말 좋은 취미네요. 최근에 읽은 책 중에 인상 깊었던 게 있나요?',
        '저도 독서를 즐겨요. 어떤 책을 추천하고 싶으시나요?'
      ]
      selectedMessage = bookResponses[Math.floor(Math.random() * bookResponses.length)]
    } else if (lastHumanMessage.includes('영화') || lastHumanMessage.includes('드라마')) {
      const movieResponses = [
        '영화 보는 걸 좋아하시는군요! 어떤 장르를 선호하시나요?',
        '저도 영화를 자주 봐요. 최근에 본 영화 중에 추천하고 싶은 게 있나요?',
        '영화는 정말 좋은 여가 활동이에요. 어떤 영화가 가장 인상 깊었나요?'
      ]
      selectedMessage = movieResponses[Math.floor(Math.random() * movieResponses.length)]
    } else if (lastHumanMessage.includes('음악')) {
      const musicResponses = [
        '음악도 좋아하시는군요! 어떤 장르를 선호하시나요?',
        '저도 음악 듣는 걸 좋아해요. 최근에 듣고 있는 곡이 있나요?',
        '음악은 기분을 바꿔주는 좋은 방법이에요. 어떤 음악을 추천하고 싶으시나요?'
      ]
      selectedMessage = musicResponses[Math.floor(Math.random() * musicResponses.length)]
    } else if (lastHumanMessage.includes('여행')) {
      const travelResponses = [
        '여행 다니는 걸 좋아하시는군요! 어디로 여행 가보고 싶으신가요?',
        '저도 여행을 좋아해요. 가장 인상 깊었던 여행지는 어디인가요?',
        '여행은 정말 좋은 경험이에요. 어떤 곳을 추천하고 싶으시나요?'
      ]
      selectedMessage = travelResponses[Math.floor(Math.random() * travelResponses.length)]
    } else {
      // 일반적인 응답 (중복 방지)
      do {
        selectedMessage = aiMessages[Math.floor(Math.random() * aiMessages.length)]
        attempts++
      } while (recentMessages.includes(selectedMessage) && attempts < maxAttempts)
    }
    
    // AI 메시지 추가
    const aiMessage: Message = {
      id: Date.now().toString(),
      playerLabel: aiPlayerLabel,
      playerColor: state.players.find(p => p.label === aiPlayerLabel)?.color || 'bg-red-500',
      content: selectedMessage,
      isMyMessage: false,
      timestamp: '방금 전'
    }
    
    dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
    
    // 턴을 다시 사람 플레이어로 변경
    setTimeout(() => {
      dispatch({ type: 'SET_CURRENT_TURN', payload: state.myPlayerLabel! })
    }, 1000)
  }

  const submitVote = async (selectedPlayers: string[]) => {
    if (!state.myPlayerLabel || !state.gameId) return

    const result = await handleVoteSubmit(
      selectedPlayers,
      state.gameId,
      state.myPlayerLabel,
      state.gameType,
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
        // 투표 모달 열기
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
      dispatch({ type: 'SET_TURN_TIME_REMAINING', payload: 10 })
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
