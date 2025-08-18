import { NextRequest, NextResponse } from 'next/server'
import { 
  addPlayerToQueue, 
  attemptMatching, 
  getQueueStats,
  processMatchmaking 
} from '@/lib/matchmaking'
import { JoinQueueRequest, JoinQueueResponse } from '@/types/matchmaking'
import { PlayerLabel } from '@/types/game'

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body: JoinQueueRequest = await request.json()
    const { queueType, playerLabel, isAI = false, aiPersonaId } = body

    // 입력 검증
    if (!queueType || !playerLabel) {
      return NextResponse.json<JoinQueueResponse>({
        success: false,
        error: 'queueType과 playerLabel은 필수입니다.'
      }, { status: 400 })
    }

    if (!['1v1', '1vn'].includes(queueType)) {
      return NextResponse.json<JoinQueueResponse>({
        success: false,
        error: '유효하지 않은 queueType입니다. 1v1 또는 1vn이어야 합니다.'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(playerLabel)) {
      return NextResponse.json<JoinQueueResponse>({
        success: false,
        error: '유효하지 않은 playerLabel입니다. A, B, C, D, E 중 하나여야 합니다.'
      }, { status: 400 })
    }

    // 대기열 통계 조회
    const queueStats = getQueueStats(queueType)
    const estimatedWaitTime = queueStats.estimatedWaitTime

    // 대기열에 플레이어 추가
    const queueEntry = await addPlayerToQueue(
      queueType,
      playerLabel as PlayerLabel,
      isAI,
      aiPersonaId
    )

    // 즉시 매칭 시도
    const matchResult = await attemptMatching(queueType, queueEntry)

    if (matchResult) {
      // 즉시 매칭 성공
      return NextResponse.json<JoinQueueResponse>({
        success: true,
        gameId: matchResult.gameId,
        matchResult,
        estimatedWaitTime: 0
      })
    } else {
      // 대기열에 추가됨
      return NextResponse.json<JoinQueueResponse>({
        success: true,
        queueEntryId: queueEntry.id,
        estimatedWaitTime
      })
    }

  } catch (error) {
    console.error('Matchmaking join error:', error)
    
    return NextResponse.json<JoinQueueResponse>({
      success: false,
      error: error instanceof Error ? error.message : '매치메이킹 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 대기열 상태 조회 (GET 요청)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queueType = searchParams.get('queueType') as '1v1' | '1vn'

    if (!queueType || !['1v1', '1vn'].includes(queueType)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 queueType입니다.'
      }, { status: 400 })
    }

    const stats = getQueueStats(queueType)
    
    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Queue stats error:', error)
    
    return NextResponse.json({
      success: false,
      error: '대기열 통계 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
