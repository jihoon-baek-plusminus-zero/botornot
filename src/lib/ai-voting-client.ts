import { AIVotingRequest, AIVotingResponse } from '@/types/ai-voting'

const API_BASE_URL = '/api/ai/voting'

// AI 투표 트리거
export async function triggerAIVoting(request: AIVotingRequest): Promise<AIVotingResponse> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error triggering AI voting:', error)
    throw error
  }
}

// AI 투표 통계 조회
export async function getAIVotingStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=stats`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error getting AI voting stats:', error)
    throw error
  }
}

// AI 투표 로그 조회
export async function getAIVotingLogs(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=logs`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error getting AI voting logs:', error)
    throw error
  }
}

// AI 투표 통계 초기화
export async function resetAIVotingStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=reset-stats`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error resetting AI voting stats:', error)
    throw error
  }
}

// AI 투표 로그 초기화
export async function clearAIVotingLogs(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=clear-logs`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error clearing AI voting logs:', error)
    throw error
  }
}

// AI 투표 테스트
export async function testAIVoting(gameId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('Error testing AI voting:', error)
    throw error
  }
}

// 게임의 모든 AI 플레이어에 대해 투표 트리거
export async function triggerAIVotingForAllAIPlayers(gameId: string): Promise<any[]> {
  try {
    // 게임 정보 조회
    const gameResponse = await fetch(`/api/game/info?gameId=${gameId}`)
    const gameData = await gameResponse.json()

    if (!gameResponse.ok) {
      throw new Error(gameData.error || 'Failed to fetch game info')
    }

    // AI 플레이어들 찾기
    const aiPlayers = gameData.data.players.filter((player: any) => player.is_ai)

    if (aiPlayers.length === 0) {
      console.log(`[AI Voting] No AI players found in game ${gameId}`)
      return []
    }

    console.log(`[AI Voting] Triggering voting for ${aiPlayers.length} AI players in game ${gameId}`)

    // 각 AI 플레이어에 대해 투표 트리거
    const votingPromises = aiPlayers.map(async (player: any) => {
      try {
        const votingRequest: AIVotingRequest = {
          gameId,
          playerLabel: player.label,
          votingType: gameData.data.game_type === '1v1' ? 'binary' : 'multi_select',
          maxSelections: gameData.data.game_type === '1v1' ? 1 : 2
        }

        const result = await triggerAIVoting(votingRequest)
        console.log(`[AI Voting] Successfully triggered voting for AI player ${player.label}`)
        return { player: player.label, success: true, result }
      } catch (error) {
        console.error(`[AI Voting] Failed to trigger voting for AI player ${player.label}:`, error)
        return { player: player.label, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    const results = await Promise.all(votingPromises)
    
    const successfulVotes = results.filter(r => r.success).length
    console.log(`[AI Voting] Completed voting for ${successfulVotes}/${aiPlayers.length} AI players in game ${gameId}`)
    
    return results
  } catch (error) {
    console.error(`[AI Voting] Error triggering voting for all AI players in game ${gameId}:`, error)
    throw error
  }
}

// 게임의 특정 AI 플레이어에 대해 투표 트리거
export async function triggerAIVotingForGame(gameId: string, playerLabel: string): Promise<AIVotingResponse> {
  try {
    // 게임 정보 조회
    const gameResponse = await fetch(`/api/game/info?gameId=${gameId}`)
    const gameData = await gameResponse.json()

    if (!gameResponse.ok) {
      throw new Error(gameData.error || 'Failed to fetch game info')
    }

    const votingRequest: AIVotingRequest = {
      gameId,
      playerLabel,
      votingType: gameData.data.game_type === '1v1' ? 'binary' : 'multi_select',
      maxSelections: gameData.data.game_type === '1v1' ? 1 : 2
    }

    return await triggerAIVoting(votingRequest)
  } catch (error) {
    console.error(`[AI Voting] Error triggering voting for player ${playerLabel} in game ${gameId}:`, error)
    throw error
  }
}

// 강제 AI 투표 트리거 (게임 상태와 관계없이)
export async function forceAIVotingForGame(gameId: string, playerLabel: string): Promise<AIVotingResponse> {
  try {
    const votingRequest: AIVotingRequest = {
      gameId,
      playerLabel,
      votingType: 'binary', // 기본값
      maxSelections: 1,
      forceVoting: true
    }

    return await triggerAIVoting(votingRequest)
  } catch (error) {
    console.error(`[AI Voting] Error forcing voting for player ${playerLabel} in game ${gameId}:`, error)
    throw error
  }
}

// 게임별 AI 투표 통계 조회
export async function getAIVotingStatsForGame(gameId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}?action=stats&gameId=${gameId}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    console.error(`[AI Voting] Error getting stats for game ${gameId}:`, error)
    throw error
  }
}

// AI 투표 모니터링
export function monitorAIVoting(
  gameId: string,
  onVotingComplete?: (results: any[]) => void,
  onError?: (error: Error) => void,
  interval: number = 5000
): () => void {
  let isMonitoring = true

  const checkVotingStatus = async () => {
    if (!isMonitoring) return

    try {
      const stats = await getAIVotingStatsForGame(gameId)
      
      // 투표 완료 조건 확인 (실제 구현에서는 더 정교한 로직 필요)
      if (stats.completedVotes >= stats.totalAIPlayers) {
        if (onVotingComplete) {
          onVotingComplete(stats.results)
        }
        return
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'))
      }
    }

    if (isMonitoring) {
      setTimeout(checkVotingStatus, interval)
    }
  }

  checkVotingStatus()

  return () => {
    isMonitoring = false
  }
}

// AI 투표 성능 분석
export async function analyzeAIVotingPerformance(gameId: string): Promise<any> {
  try {
    const stats = await getAIVotingStatsForGame(gameId)
    const logs = await getAIVotingLogs()

    // 성능 분석 로직
    const analysis = {
      gameId,
      totalVotes: stats.totalVotes || 0,
      successfulVotes: stats.successfulVotes || 0,
      failedVotes: stats.failedVotes || 0,
      averageResponseTime: stats.averageResponseTime || 0,
      successRate: stats.totalVotes > 0 ? (stats.successfulVotes / stats.totalVotes) * 100 : 0,
      recentErrors: logs.filter((log: any) => log.gameId === gameId && log.status === 'failed').slice(-5)
    }

    return analysis
  } catch (error) {
    console.error(`[AI Voting] Error analyzing performance for game ${gameId}:`, error)
    throw error
  }
}

// AI 투표 최적화 제안
export async function getAIVotingOptimizationSuggestions(): Promise<string[]> {
  try {
    const stats = await getAIVotingStats()
    const suggestions: string[] = []

    // 성공률이 낮은 경우
    if (stats.successRate < 80) {
      suggestions.push('AI 투표 성공률이 낮습니다. 프롬프트 최적화를 고려해보세요.')
    }

    // 응답 시간이 긴 경우
    if (stats.averageResponseTime > 5000) {
      suggestions.push('AI 투표 응답 시간이 깁니다. 모델 최적화나 캐싱을 고려해보세요.')
    }

    // 오류가 많은 경우
    if (stats.failedVotes > stats.successfulVotes * 0.2) {
      suggestions.push('AI 투표 오류가 많습니다. 에러 핸들링을 개선해보세요.')
    }

    return suggestions
  } catch (error) {
    console.error('[AI Voting] Error getting optimization suggestions:', error)
    return ['최적화 제안을 가져오는 중 오류가 발생했습니다.']
  }
}
