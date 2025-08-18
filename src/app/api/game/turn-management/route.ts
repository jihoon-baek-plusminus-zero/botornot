import { NextRequest, NextResponse } from 'next/server'
import { 
  changeTurn, 
  initializeTurnManagement, 
  getTurnState,
  updateTurnTimer,
  handleMessageSent,
  getTurnHistory
} from '@/lib/turn-management'
import { TurnChangeRequest, TurnChangeResponse } from '@/types/turn-management'
import { PlayerLabel } from '@/types/game'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'change_turn':
        return await handleChangeTurn(data as TurnChangeRequest)
      
      case 'initialize':
        return await handleInitialize(data as { gameId: string; firstPlayer: PlayerLabel })
      
      case 'message_sent':
        return await handleMessageSent(data as { gameId: string; playerLabel: PlayerLabel })
      
      default:
        return NextResponse.json({
          success: false,
          error: '유효하지 않은 액션입니다.'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Turn management error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '턴 관리 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 턴 변경 처리
async function handleChangeTurn(request: TurnChangeRequest): Promise<NextResponse> {
  const result = await changeTurn(request)
  
  if (result.success) {
    return NextResponse.json(result)
  } else {
    return NextResponse.json(result, { status: 400 })
  }
}

// 턴 관리 초기화
async function handleInitialize(data: { gameId: string; firstPlayer: PlayerLabel }): Promise<NextResponse> {
  try {
    const { gameId, firstPlayer } = data
    
    if (!gameId || !firstPlayer) {
      return NextResponse.json({
        success: false,
        error: 'gameId와 firstPlayer는 필수입니다.'
      }, { status: 400 })
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(firstPlayer)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 firstPlayer입니다.'
      }, { status: 400 })
    }

    const turnState = initializeTurnManagement(gameId, firstPlayer as PlayerLabel)

    return NextResponse.json({
      success: true,
      turnState
    })

  } catch (error) {
    console.error('Initialize turn management error:', error)
    
    return NextResponse.json({
      success: false,
      error: '턴 관리 초기화에 실패했습니다.'
    }, { status: 500 })
  }
}

// 메시지 전송 시 턴 자동 변경
async function handleMessageSent(data: { gameId: string; playerLabel: PlayerLabel }): Promise<NextResponse> {
  try {
    const { gameId, playerLabel } = data
    
    if (!gameId || !playerLabel) {
      return NextResponse.json({
        success: false,
        error: 'gameId와 playerLabel은 필수입니다.'
      }, { status: 400 })
    }

    await handleMessageSent(gameId, playerLabel as PlayerLabel)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Handle message sent error:', error)
    
    return NextResponse.json({
      success: false,
      error: '메시지 전송 처리에 실패했습니다.'
    }, { status: 500 })
  }
}

// GET 요청으로 턴 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')
    const action = searchParams.get('action')

    if (!gameId) {
      return NextResponse.json({
        success: false,
        error: 'gameId는 필수입니다.'
      }, { status: 400 })
    }

    switch (action) {
      case 'state':
        return await handleGetTurnState(gameId)
      
      case 'history':
        return await handleGetTurnHistory(gameId)
      
      default:
        return NextResponse.json({
          success: false,
          error: '유효하지 않은 액션입니다.'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Get turn management error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '턴 관리 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 턴 상태 조회
async function handleGetTurnState(gameId: string): Promise<NextResponse> {
  try {
    const turnState = getTurnState(gameId)
    
    if (!turnState) {
      return NextResponse.json({
        success: false,
        error: '턴 상태를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      turnState
    })

  } catch (error) {
    console.error('Get turn state error:', error)
    
    return NextResponse.json({
      success: false,
      error: '턴 상태 조회에 실패했습니다.'
    }, { status: 500 })
  }
}

// 턴 히스토리 조회
async function handleGetTurnHistory(gameId: string): Promise<NextResponse> {
  try {
    const history = await getTurnHistory(gameId)

    return NextResponse.json({
      success: true,
      history
    })

  } catch (error) {
    console.error('Get turn history error:', error)
    
    return NextResponse.json({
      success: false,
      error: '턴 히스토리 조회에 실패했습니다.'
    }, { status: 500 })
  }
}
