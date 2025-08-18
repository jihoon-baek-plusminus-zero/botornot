import {
  TurnChangeRequest,
  TurnChangeResponse,
  TurnManagementState
} from '@/types/turn-management'
import { PlayerLabel } from '@/types/game'

const API_BASE_URL = '/api/game'

/**
 * 턴 관리 초기화
 */
export async function initializeTurnManagement(
  gameId: string,
  firstPlayer: PlayerLabel
): Promise<{ success: boolean; turnState?: TurnManagementState; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'initialize',
        gameId,
        firstPlayer
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '턴 관리 초기화에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Initialize turn management error:', error)
    throw error
  }
}

/**
 * 턴 변경
 */
export async function changeTurn(request: TurnChangeRequest): Promise<TurnChangeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'change_turn',
        ...request
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '턴 변경에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Change turn error:', error)
    throw error
  }
}

/**
 * 메시지 전송 시 턴 자동 변경
 */
export async function handleMessageSent(
  gameId: string,
  playerLabel: PlayerLabel
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'message_sent',
        gameId,
        playerLabel
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '메시지 전송 처리에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Handle message sent error:', error)
    throw error
  }
}

/**
 * 턴 상태 조회
 */
export async function getTurnState(gameId: string): Promise<{ success: boolean; turnState?: TurnManagementState; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-management?gameId=${gameId}&action=state`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '턴 상태 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get turn state error:', error)
    throw error
  }
}

/**
 * 턴 히스토리 조회
 */
export async function getTurnHistory(gameId: string): Promise<{ success: boolean; history?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-management?gameId=${gameId}&action=history`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '턴 히스토리 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get turn history error:', error)
    throw error
  }
}

/**
 * 턴 타이머 업데이트
 */
export async function updateTurnTimer(gameId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn-timer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '턴 타이머 업데이트에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Update turn timer error:', error)
    throw error
  }
}

/**
 * 다음 플레이어 찾기 (클라이언트 사이드)
 */
export function getNextPlayer(
  currentPlayer: PlayerLabel,
  activePlayers: PlayerLabel[]
): PlayerLabel {
  const playerOrder: PlayerLabel[] = ['A', 'B', 'C', 'D', 'E']
  const currentIndex = playerOrder.indexOf(currentPlayer)
  
  // 현재 플레이어부터 다음 플레이어를 찾기
  for (let i = 1; i <= playerOrder.length; i++) {
    const nextIndex = (currentIndex + i) % playerOrder.length
    const nextPlayer = playerOrder[nextIndex]
    
    // 활성 플레이어인지 확인
    if (activePlayers.includes(nextPlayer)) {
      return nextPlayer
    }
  }
  
  // 활성 플레이어가 없으면 첫 번째 플레이어 반환
  return activePlayers[0] || 'A'
}

/**
 * 턴 자동 변경 (메시지 전송 후)
 */
export async function autoChangeTurn(
  gameId: string,
  currentPlayer: PlayerLabel,
  activePlayers: PlayerLabel[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const nextPlayer = getNextPlayer(currentPlayer, activePlayers)
    
    const result = await changeTurn({
      gameId,
      nextPlayerLabel: nextPlayer,
      reason: 'message_sent'
    })

    return result
  } catch (error) {
    console.error('Auto change turn error:', error)
    throw error
  }
}

/**
 * 턴 타이머 폴링 (클라이언트 사이드)
 */
export function startTurnTimerPolling(
  gameId: string,
  onTimerUpdate: (timeRemaining: number, isWarning: boolean) => void,
  onError: (error: Error) => void,
  interval: number = 1000 // 1초마다 업데이트
): () => void {
  let isPolling = true
  let pollInterval: NodeJS.Timeout

  const poll = async () => {
    if (!isPolling) return

    try {
      const result = await updateTurnTimer(gameId)
      
      if (result.success) {
        // 타이머 상태 조회
        const turnState = await getTurnState(gameId)
        if (turnState.success && turnState.turnState) {
          const { turnTimeRemaining } = turnState.turnState
          const isWarning = turnTimeRemaining <= 3 // 3초 이하면 경고
          onTimerUpdate(turnTimeRemaining, isWarning)
        }
      }
    } catch (error) {
      isPolling = false
      clearInterval(pollInterval)
      onError(error as Error)
    }
  }

  pollInterval = setInterval(poll, interval)

  // 폴링 중지 함수 반환
  return () => {
    isPolling = false
    clearInterval(pollInterval)
  }
}

/**
 * 턴 관리 시뮬레이션 (테스트용)
 */
export async function simulateTurnChange(
  gameId: string,
  currentPlayer: PlayerLabel,
  delay: number = 2000
): Promise<TurnChangeResponse> {
  // 실제 API 호출 대신 시뮬레이션
  return new Promise((resolve) => {
    setTimeout(() => {
      const playerOrder: PlayerLabel[] = ['A', 'B', 'C', 'D', 'E']
      const currentIndex = playerOrder.indexOf(currentPlayer)
      const nextIndex = (currentIndex + 1) % playerOrder.length
      const nextPlayer = playerOrder[nextIndex]

      resolve({
        success: true,
        newTurn: nextPlayer,
        turnTimeRemaining: 10
      })
    }, delay)
  })
}
