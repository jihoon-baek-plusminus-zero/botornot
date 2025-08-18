import { NextRequest, NextResponse } from 'next/server'
import { processMatchmaking } from '@/lib/matchmaking'

export async function POST(request: NextRequest) {
  try {
    // 매치메이킹 처리 실행
    await processMatchmaking()
    
    return NextResponse.json({
      success: true,
      message: '매치메이킹 처리가 완료되었습니다.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Matchmaking process error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '매치메이킹 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// GET 요청으로도 처리 가능 (크론잡 등에서 호출)
export async function GET() {
  return POST(new NextRequest('http://localhost/api/matchmaking/process'))
}
