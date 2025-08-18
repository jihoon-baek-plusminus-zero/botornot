import {
  SendMessageRequest,
  SendMessageResponse,
  SubmitVoteRequest,
  SubmitVoteResponse,
  UpdateGameStatusRequest,
  UpdateGameStatusResponse,
  ChangeTurnRequest,
  ChangeTurnResponse,
  GetGameInfoResponse,
  GetGameMessagesResponse,
  GetGameVotesResponse,
  GetGameStatsResponse
} from '@/types/game-api'

const API_BASE_URL = '/api/game'

/**
 * 메시지 전송
 */
export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '메시지 전송에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Send message error:', error)
    throw error
  }
}

/**
 * 투표 제출
 */
export async function submitVote(request: SubmitVoteRequest): Promise<SubmitVoteResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/submit-vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '투표 제출에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Submit vote error:', error)
    throw error
  }
}

/**
 * 게임 상태 업데이트
 */
export async function updateGameStatus(request: UpdateGameStatusRequest): Promise<UpdateGameStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '게임 상태 업데이트에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Update game status error:', error)
    throw error
  }
}

/**
 * 턴 변경
 */
export async function changeTurn(request: ChangeTurnRequest): Promise<ChangeTurnResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/change-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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
 * 게임 정보 조회
 */
export async function getGameInfo(gameId: string): Promise<GetGameInfoResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/info?gameId=${gameId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '게임 정보 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get game info error:', error)
    throw error
  }
}

/**
 * 게임 메시지 조회
 */
export async function getGameMessages(
  gameId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<GetGameMessagesResponse> {
  try {
    const params = new URLSearchParams({
      gameId,
      limit: limit.toString(),
      offset: offset.toString()
    })

    const response = await fetch(`${API_BASE_URL}/messages?${params.toString()}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '게임 메시지 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get game messages error:', error)
    throw error
  }
}

/**
 * 게임 투표 조회
 */
export async function getGameVotes(gameId: string): Promise<GetGameVotesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/votes?gameId=${gameId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '게임 투표 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get game votes error:', error)
    throw error
  }
}

/**
 * 게임 통계 조회
 */
export async function getGameStats(gameId: string): Promise<GetGameStatsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats?gameId=${gameId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '게임 통계 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get game stats error:', error)
    throw error
  }
}

/**
 * 게임 시작
 */
export async function startGame(gameId: string, firstTurn?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateGameStatus({
      gameId,
      status: 'active',
      currentTurn: firstTurn || 'A',
      timeRemaining: 300, // 5분
      turnTimeRemaining: 10
    })

    return result
  } catch (error) {
    console.error('Start game error:', error)
    throw error
  }
}

/**
 * 투표 시작
 */
export async function startVoting(gameId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateGameStatus({
      gameId,
      status: 'voting',
      timeRemaining: 60 // 1분
    })

    return result
  } catch (error) {
    console.error('Start voting error:', error)
    throw error
  }
}

/**
 * 게임 종료
 */
export async function endGame(gameId: string, reason: 'timeout' | 'all_voted' | 'manual' = 'manual'): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateGameStatus({
      gameId,
      status: 'finished'
    })

    return result
  } catch (error) {
    console.error('End game error:', error)
    throw error
  }
}

/**
 * 다음 턴으로 자동 변경
 */
export async function nextTurn(gameId: string, currentTurn: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 플레이어 순서: A -> B -> C -> D -> E -> A
    const playerOrder = ['A', 'B', 'C', 'D', 'E']
    const currentIndex = playerOrder.indexOf(currentTurn)
    const nextIndex = (currentIndex + 1) % playerOrder.length
    const nextPlayer = playerOrder[nextIndex]

    const result = await changeTurn({
      gameId,
      nextPlayerLabel: nextPlayer,
      turnTimeRemaining: 10
    })

    return result
  } catch (error) {
    console.error('Next turn error:', error)
    throw error
  }
}

/**
 * 게임 데이터 전체 조회 (게임 정보 + 메시지 + 투표)
 */
export async function getFullGameData(gameId: string) {
  try {
    const [gameInfo, messages, votes, stats] = await Promise.all([
      getGameInfo(gameId),
      getGameMessages(gameId),
      getGameVotes(gameId),
      getGameStats(gameId)
    ])

    return {
      success: true,
      gameInfo: gameInfo.game,
      players: gameInfo.players,
      messages: messages.messages,
      votes: votes.votes,
      stats: stats.stats
    }
  } catch (error) {
    console.error('Get full game data error:', error)
    throw error
  }
}
