import { NextRequest, NextResponse } from 'next/server'
import { getGameInfo } from '@/lib/matchmaking'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queueEntryId = searchParams.get('queueEntryId')
    const gameId = searchParams.get('gameId')

    if (!queueEntryId && !gameId) {
      return NextResponse.json({
        success: false,
        error: 'queueEntryId 또는 gameId가 필요합니다.'
      }, { status: 400 })
    }

    let status = {
      isMatched: false,
      gameId: null as string | null,
      matchResult: null as any
    }

    // 게임 ID가 있으면 매칭 완료된 상태
    if (gameId) {
      const gameInfo = getGameInfo(gameId)
      if (gameInfo) {
        status = {
          isMatched: true,
          gameId,
          matchResult: gameInfo
        }
      }
    }

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('Matchmaking status error:', error)
    
    return NextResponse.json({
      success: false,
      error: '매치메이킹 상태 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
