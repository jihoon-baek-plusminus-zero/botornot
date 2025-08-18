import {
  AITurnRequest,
  AITurnResponse,
  AITurnStats,
  AITurnLog
} from '@/types/ai-turn'
import { PlayerLabel, GameType } from '@/types/game'

const API_BASE_URL = '/api/ai'

/**
 * AI 턴 처리
 */
export async function handleAITurn(request: AITurnRequest): Promise<AITurnResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 턴 처리에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Handle AI turn error:', error)
    throw error
  }
}

/**
 * AI 턴 통계 조회
 */
export async function getAITurnStats(): Promise<{ success: boolean; stats?: AITurnStats; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn?action=stats`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 턴 통계 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI turn stats error:', error)
    throw error
  }
}

/**
 * AI 턴 로그 조회
 */
export async function getAITurnLogs(options?: {
  limit?: number
  offset?: number
  gameId?: string
}): Promise<{ success: boolean; logs?: AITurnLog[]; total?: number; limit?: number; offset?: number; error?: string }> {
  try {
    const params = new URLSearchParams()
    params.append('action', 'logs')
    
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    if (options?.gameId) params.append('gameId', options.gameId)

    const response = await fetch(`${API_BASE_URL}/turn?${params.toString()}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 턴 로그 조회에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Get AI turn logs error:', error)
    throw error
  }
}

/**
 * AI 턴 통계 리셋
 */
export async function resetAITurnStats(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn?action=reset`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 턴 통계 리셋에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Reset AI turn stats error:', error)
    throw error
  }
}

/**
 * AI 턴 로그 정리
 */
export async function clearAITurnLogs(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/turn?action=clear-logs`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'AI 턴 로그 정리에 실패했습니다.')
    }

    return await response.json()
  } catch (error) {
    console.error('Clear AI turn logs error:', error)
    throw error
  }
}

/**
 * 간단한 AI 턴 처리 (기본 설정 사용)
 */
export async function handleSimpleAITurn(
  gameId: string,
  playerLabel: PlayerLabel,
  personaId: number,
  gameType: GameType,
  currentTopic: string,
  conversationHistory: Array<{
    playerLabel: PlayerLabel
    content: string
    timestamp: string
    isSystemMessage: boolean
  }>,
  turnTimeRemaining: number,
  gameStatus: 'active' | 'voting' | 'finished',
  voteCount: number,
  totalPlayers: number,
  timeRemaining: number,
  currentTurn: PlayerLabel,
  players: Array<{
    label: PlayerLabel
    name: string
    isAI: boolean
    isActive: boolean
    hasVoted: boolean
  }>
): Promise<AITurnResponse> {
  return handleAITurn({
    gameId,
    playerLabel,
    personaId,
    gameType,
    currentTopic,
    conversationHistory,
    turnTimeRemaining,
    gameStatus,
    voteCount,
    totalPlayers,
    timeRemaining,
    currentTurn,
    players
  })
}

/**
 * AI 턴 처리 (재시도 로직 포함)
 */
export async function handleAITurnWithRetry(
  request: AITurnRequest,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<AITurnResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await handleAITurn(request)
      
      if (result.success) {
        return result
      } else {
        lastError = new Error(result.error || 'AI 턴 처리 실패')
      }
    } catch (error) {
      lastError = error as Error
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError || new Error('AI 턴 처리에 실패했습니다.')
}

/**
 * AI 턴 처리 시뮬레이션 (테스트용)
 */
export async function simulateAITurn(
  gameId: string,
  playerLabel: PlayerLabel,
  personaId: number,
  delay: number = 3000
): Promise<AITurnResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const shouldVote = Math.random() > 0.5
      
      if (shouldVote) {
        resolve({
          success: true,
          turnStatus: 'completed',
          voteDecision: {
            success: true,
            shouldVote: true,
            reason: '충분한 정보가 있어 투표합니다.',
            confidence: 0.8,
            analysis: {
              gameProgress: 0.7,
              conversationQuality: 0.8,
              timePressure: 0.6,
              playerBehavior: 'balanced'
            }
          },
          actions: [
            {
              type: 'vote',
              data: { reason: '충분한 정보가 있어 투표합니다.', confidence: 0.8 },
              timestamp: new Date().toISOString()
            }
          ],
          metadata: {
            totalProcessingTime: delay,
            personaId,
            playerLabel,
            gameId
          }
        })
      } else {
        resolve({
          success: true,
          turnStatus: 'completed',
          voteDecision: {
            success: true,
            shouldVote: false,
            reason: '더 많은 정보가 필요합니다.',
            confidence: 0.7,
            analysis: {
              gameProgress: 0.4,
              conversationQuality: 0.6,
              timePressure: 0.3,
              playerBehavior: 'balanced'
            }
          },
          messageGeneration: {
            success: true,
            message: '안녕하세요! 오늘 날씨가 정말 좋네요 😊',
            metadata: {
              responseTime: delay,
              tokenUsage: 50,
              quality: 0.8
            }
          },
          actions: [
            {
              type: 'message',
              data: { message: '안녕하세요! 오늘 날씨가 정말 좋네요 😊' },
              timestamp: new Date().toISOString()
            }
          ],
          metadata: {
            totalProcessingTime: delay,
            personaId,
            playerLabel,
            gameId
          }
        })
      }
    }, delay)
  })
}

/**
 * AI 턴 처리 배치 실행
 */
export async function handleBatchAITurns(
  requests: AITurnRequest[]
): Promise<AITurnResponse[]> {
  const promises = requests.map(request => handleAITurn(request))
  return Promise.all(promises)
}

/**
 * AI 턴 처리 모니터링
 */
export function monitorAITurns(
  onTurnStart: (request: AITurnRequest) => void,
  onTurnComplete: (response: AITurnResponse) => void,
  onTurnError: (error: Error) => void
) {
  return {
    start: (request: AITurnRequest) => {
      onTurnStart(request)
      return handleAITurn(request)
        .then(response => {
          onTurnComplete(response)
          return response
        })
        .catch(error => {
          onTurnError(error)
          throw error
        })
    }
  }
}

/**
 * AI 턴 처리 성능 분석
 */
export async function analyzeAITurnPerformance(gameId?: string): Promise<{
  averageProcessingTime: number
  successRate: number
  voteRate: number
  messageRate: number
  errorRate: number
  personaPerformance: Record<number, {
    totalTurns: number
    successRate: number
    averageProcessingTime: number
  }>
}> {
  try {
    const stats = await getAITurnStats()
    const logs = await getAITurnLogs({ gameId, limit: 1000 })

    if (!stats.success || !logs.success) {
      throw new Error('통계 또는 로그 조회에 실패했습니다.')
    }

    const statsData = stats.stats!
    const logsData = logs.logs!

    // 페르소나별 성능 분석
    const personaPerformance: Record<number, {
      totalTurns: number
      successRate: number
      averageProcessingTime: number
    }> = {}

    Object.entries(statsData.personaUsage).forEach(([personaId, count]) => {
      const personaLogs = logsData.filter(log => log.personaId === parseInt(personaId))
      const successfulLogs = personaLogs.filter(log => log.turnStatus === 'completed')
      
      personaPerformance[parseInt(personaId)] = {
        totalTurns: count,
        successRate: personaLogs.length > 0 ? successfulLogs.length / personaLogs.length : 0,
        averageProcessingTime: personaLogs.length > 0 
          ? personaLogs.reduce((sum, log) => sum + log.processingTime, 0) / personaLogs.length 
          : 0
      }
    })

    return {
      averageProcessingTime: statsData.averageProcessingTime,
      successRate: statsData.totalTurns > 0 ? statsData.successfulTurns / statsData.totalTurns : 0,
      voteRate: statsData.voteDecisions.total > 0 ? statsData.voteDecisions.voted / statsData.voteDecisions.total : 0,
      messageRate: statsData.messageGenerations.total > 0 ? statsData.messageGenerations.generated / statsData.messageGenerations.total : 0,
      errorRate: statsData.totalTurns > 0 ? statsData.failedTurns / statsData.totalTurns : 0,
      personaPerformance
    }
  } catch (error) {
    console.error('AI 턴 성능 분석 오류:', error)
    throw error
  }
}

/**
 * AI 턴 처리 최적화 제안
 */
export async function getAITurnOptimizationSuggestions(): Promise<{
  suggestions: string[]
  priority: 'low' | 'medium' | 'high'
  impact: number
}[]> {
  try {
    const performance = await analyzeAITurnPerformance()
    const suggestions: Array<{
      suggestions: string[]
      priority: 'low' | 'medium' | 'high'
      impact: number
    }> = []

    // 성공률 기반 제안
    if (performance.successRate < 0.8) {
      suggestions.push({
        suggestions: [
          'AI 턴 처리 성공률이 낮습니다. 에러 로그를 확인하고 재시도 로직을 강화하세요.',
          'AI API 응답 시간을 늘려 안정성을 높이세요.'
        ],
        priority: 'high',
        impact: 0.9
      })
    }

    // 처리 시간 기반 제안
    if (performance.averageProcessingTime > 5000) {
      suggestions.push({
        suggestions: [
          'AI 턴 처리 시간이 길어집니다. 캐시 시스템을 도입하세요.',
          'AI 응답 생성 최적화를 고려하세요.'
        ],
        priority: 'medium',
        impact: 0.7
      })
    }

    // 투표율 기반 제안
    if (performance.voteRate < 0.3) {
      suggestions.push({
        suggestions: [
          'AI 투표율이 낮습니다. 투표 결정 임계값을 조정하세요.',
          '투표 결정 로직을 개선하세요.'
        ],
        priority: 'medium',
        impact: 0.6
      })
    }

    // 페르소나별 성능 제안
    Object.entries(performance.personaPerformance).forEach(([personaId, perf]) => {
      if (perf.successRate < 0.7) {
        suggestions.push({
          suggestions: [
            `페르소나 ${personaId}의 성공률이 낮습니다. 해당 페르소나 설정을 검토하세요.`
          ],
          priority: 'medium',
          impact: 0.5
        })
      }
    })

    return suggestions
  } catch (error) {
    console.error('AI 턴 최적화 제안 오류:', error)
    return []
  }
}
