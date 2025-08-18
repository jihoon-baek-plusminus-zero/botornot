import { 
  JoinQueueRequest, 
  JoinQueueResponse,
  QueueStats 
} from '@/types/matchmaking'

const API_BASE_URL = '/api/matchmaking'

/**
 * 대기열에 참가
 */
export async function joinQueue(request: JoinQueueRequest): Promise<JoinQueueResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '대기열 참가에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Join queue error:', error)
    throw error
  }
}

/**
 * 대기열에서 나가기
 */
export async function leaveQueue(queueType: '1v1' | '1vn', playerId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ queueType, playerId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '대기열에서 나가기에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Leave queue error:', error)
    throw error
  }
}

/**
 * 대기열 상태 조회
 */
export async function getQueueStats(queueType: '1v1' | '1vn'): Promise<QueueStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/join?queueType=${queueType}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '대기열 통계 조회에 실패했습니다.')
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Get queue stats error:', error)
    throw error
  }
}

/**
 * 매치메이킹 상태 확인
 */
export async function checkMatchmakingStatus(queueEntryId?: string, gameId?: string): Promise<{
  isMatched: boolean
  gameId: string | null
  matchResult: any
}> {
  try {
    const params = new URLSearchParams()
    if (queueEntryId) params.append('queueEntryId', queueEntryId)
    if (gameId) params.append('gameId', gameId)

    const response = await fetch(`${API_BASE_URL}/status?${params.toString()}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '매치메이킹 상태 확인에 실패했습니다.')
    }

    const data = await response.json()
    return data.status
  } catch (error) {
    console.error('Check matchmaking status error:', error)
    throw error
  }
}

/**
 * 주기적으로 매치메이킹 상태 확인 (폴링)
 */
export function pollMatchmakingStatus(
  queueEntryId: string,
  onMatchFound: (gameId: string, matchResult: any) => void,
  onError: (error: Error) => void,
  interval: number = 2000 // 2초마다 확인
): () => void {
  let isPolling = true
  let pollInterval: NodeJS.Timeout

  const poll = async () => {
    if (!isPolling) return

    try {
      const status = await checkMatchmakingStatus(queueEntryId)
      
      if (status.isMatched && status.gameId) {
        isPolling = false
        clearInterval(pollInterval)
        onMatchFound(status.gameId, status.matchResult)
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
 * 매치메이킹 시뮬레이션 (테스트용)
 */
export async function simulateMatchmaking(
  queueType: '1v1' | '1vn',
  playerLabel: string,
  delay: number = 3000
): Promise<JoinQueueResponse> {
  // 실제 API 호출 대신 시뮬레이션
  return new Promise((resolve) => {
    setTimeout(() => {
      const gameId = `game-${Date.now()}`
      resolve({
        success: true,
        gameId,
        matchResult: {
          gameId,
          gameType: queueType === '1v1' ? '1v1' : '1vn',
          players: [
            { id: '1', playerLabel: 'A', joinedAt: new Date().toISOString(), isAI: false },
            { id: '2', playerLabel: 'B', joinedAt: new Date().toISOString(), isAI: true },
            ...(queueType === '1vn' ? [
              { id: '3', playerLabel: 'C', joinedAt: new Date().toISOString(), isAI: false }
            ] : [])
          ],
          matchedAt: new Date().toISOString(),
          topicId: 1
        },
        estimatedWaitTime: 0
      })
    }, delay)
  })
}
