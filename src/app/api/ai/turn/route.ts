import { NextRequest, NextResponse } from 'next/server'
import { handleAITurn, getAITurnStats, getAITurnLogs, resetAITurnStats, clearAITurnLogs } from '@/lib/ai-turn-handler'
import { AITurnRequest, AITurnResponse } from '@/types/ai-turn'
import { PlayerLabel, GameType } from '@/types/game'

export async function POST(request: NextRequest) {
  try {
    const body: AITurnRequest = await request.json()
    const {
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
    } = body

    // 입력 검증
    if (!gameId || !playerLabel || !personaId || !gameType || !currentTopic) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '필수 필드가 누락되었습니다: gameId, playerLabel, personaId, gameType, currentTopic'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(playerLabel)) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '유효하지 않은 playerLabel입니다.'
      }, { status: 400 })
    }

    if (!['1v1', '1vn'].includes(gameType)) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '유효하지 않은 gameType입니다.'
      }, { status: 400 })
    }

    if (personaId < 1 || personaId > 10) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '유효하지 않은 personaId입니다. 1-10 사이의 값이어야 합니다.'
      }, { status: 400 })
    }

    if (!['active', 'voting', 'finished'].includes(gameStatus)) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '유효하지 않은 gameStatus입니다.'
      }, { status: 400 })
    }

    if (turnTimeRemaining < 0 || timeRemaining < 0) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '시간 값은 0 이상이어야 합니다.'
      }, { status: 400 })
    }

    if (voteCount < 0 || totalPlayers < 1 || voteCount > totalPlayers) {
      return NextResponse.json<AITurnResponse>({
        success: false,
        turnStatus: 'error',
        actions: [],
        metadata: {
          totalProcessingTime: 0,
          personaId: 0,
          playerLabel: 'A',
          gameId: ''
        },
        error: '유효하지 않은 투표 정보입니다.'
      }, { status: 400 })
    }

    // AI 턴 처리
    const result = await handleAITurn({
      gameId,
      playerLabel: playerLabel as PlayerLabel,
      personaId,
      gameType: gameType as GameType,
      currentTopic,
      conversationHistory: conversationHistory || [],
      turnTimeRemaining,
      gameStatus,
      voteCount,
      totalPlayers,
      timeRemaining,
      currentTurn: currentTurn as PlayerLabel,
      players: players || []
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }

  } catch (error) {
    console.error('AI 턴 처리 API 오류:', error)
    
    return NextResponse.json<AITurnResponse>({
      success: false,
      turnStatus: 'error',
      actions: [],
      metadata: {
        totalProcessingTime: 0,
        personaId: 0,
        playerLabel: 'A',
        gameId: ''
      },
      error: error instanceof Error ? error.message : 'AI 턴 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// GET 요청으로 AI 턴 통계 및 로그 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: getAITurnStats()
        })
      
      case 'logs':
        const logs = getAITurnLogs()
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const gameId = searchParams.get('gameId')
        
        let filteredLogs = logs
        
        if (gameId) {
          filteredLogs = logs.filter(log => log.gameId === gameId)
        }
        
        const paginatedLogs = filteredLogs.slice(offset, offset + limit)
        
        return NextResponse.json({
          success: true,
          logs: paginatedLogs,
          total: filteredLogs.length,
          limit,
          offset
        })
      
      case 'reset':
        resetAITurnStats()
        return NextResponse.json({
          success: true,
          message: 'AI 턴 통계가 리셋되었습니다.'
        })
      
      case 'clear-logs':
        clearAITurnLogs()
        return NextResponse.json({
          success: true,
          message: 'AI 턴 로그가 정리되었습니다.'
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: '유효하지 않은 액션입니다. stats, logs, reset, clear-logs 중 하나를 사용하세요.'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('AI 턴 통계 조회 오류:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI 턴 통계 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
