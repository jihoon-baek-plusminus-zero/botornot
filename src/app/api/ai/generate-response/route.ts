import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse, getAIStats, getCacheStats } from '@/lib/openai'
import { GenerateAIResponseRequest, GenerateAIResponseResponse } from '@/types/openai'
import { PlayerLabel } from '@/types/game'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAIResponseRequest = await request.json()
    const {
      gameId,
      playerLabel,
      personaId,
      conversationHistory,
      currentTopic,
      gameType,
      turnTimeRemaining,
      maxLength = 100,
      temperature = 0.7
    } = body

    // 입력 검증
    if (!gameId || !playerLabel || !personaId || !currentTopic || !gameType) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: '필수 필드가 누락되었습니다: gameId, playerLabel, personaId, currentTopic, gameType'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(playerLabel)) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: '유효하지 않은 playerLabel입니다.'
      }, { status: 400 })
    }

    if (!['1v1', '1vn'].includes(gameType)) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: '유효하지 않은 gameType입니다.'
      }, { status: 400 })
    }

    if (personaId < 1 || personaId > 10) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: '유효하지 않은 personaId입니다. 1-10 사이의 값이어야 합니다.'
      }, { status: 400 })
    }

    if (maxLength < 10 || maxLength > 500) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: 'maxLength는 10-500 사이여야 합니다.'
      }, { status: 400 })
    }

    if (temperature < 0 || temperature > 2) {
      return NextResponse.json<GenerateAIResponseResponse>({
        success: false,
        error: 'temperature는 0-2 사이여야 합니다.'
      }, { status: 400 })
    }

    // AI 응답 생성
    const result = await generateAIResponse({
      gameId,
      playerLabel: playerLabel as PlayerLabel,
      personaId,
      conversationHistory: conversationHistory || [],
      currentTopic,
      gameType,
      turnTimeRemaining: turnTimeRemaining || 10,
      maxLength,
      temperature
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }

  } catch (error) {
    console.error('AI 응답 생성 API 오류:', error)
    
    return NextResponse.json<GenerateAIResponseResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'AI 응답 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// GET 요청으로 AI 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: getAIStats()
        })
      
      case 'cache':
        return NextResponse.json({
          success: true,
          cache: getCacheStats()
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: '유효하지 않은 액션입니다. stats 또는 cache를 사용하세요.'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('AI 통계 조회 오류:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI 통계 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
