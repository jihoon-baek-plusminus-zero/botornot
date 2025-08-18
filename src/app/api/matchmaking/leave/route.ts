import { NextRequest, NextResponse } from 'next/server'
import { removePlayerFromQueue } from '@/lib/matchmaking'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queueType, playerId } = body

    // 입력 검증
    if (!queueType || !playerId) {
      return NextResponse.json({
        success: false,
        error: 'queueType과 playerId는 필수입니다.'
      }, { status: 400 })
    }

    if (!['1v1', '1vn'].includes(queueType)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 queueType입니다. 1v1 또는 1vn이어야 합니다.'
      }, { status: 400 })
    }

    // 대기열에서 플레이어 제거
    const success = await removePlayerFromQueue(queueType, playerId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: '대기열에서 성공적으로 제거되었습니다.'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '대기열에서 플레이어를 찾을 수 없습니다.'
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Matchmaking leave error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '대기열에서 나가기 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
