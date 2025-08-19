import { sendMessageToGame, submitVoteToGame, updateGameStatus } from './game-api'
import { PlayerLabel, GameStatus } from '@/types/game'

// 입력 검증 함수들
export function validateMessage(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: '메시지를 입력해주세요.' }
  }

  if (content.trim().length > 500) {
    return { isValid: false, error: '메시지는 500자를 초과할 수 없습니다.' }
  }

  // 특수 문자나 스팸 방지
  const spamPatterns = [
    /(.)\1{10,}/, // 같은 문자 10번 이상 반복
    /[A-Z]{20,}/, // 대문자 20개 이상
    /[!@#$%^&*()]{10,}/, // 특수문자 10개 이상
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: '부적절한 메시지입니다.' }
    }
  }

  return { isValid: true }
}

export function validateVote(
  selectedPlayers: string[],
  gameType: '1v1' | '1vn',
  myPlayerLabel: string
): { isValid: boolean; error?: string } {
  if (selectedPlayers.length === 0) {
    return { isValid: false, error: '투표할 플레이어를 선택해주세요.' }
  }

  // 자신에게 투표하는 것 방지
  if (selectedPlayers.includes(myPlayerLabel)) {
    return { isValid: false, error: '자신에게는 투표할 수 없습니다.' }
  }

  if (gameType === '1v1') {
    if (selectedPlayers.length !== 1) {
      return { isValid: false, error: '1:1 게임에서는 한 명만 선택해야 합니다.' }
    }
  } else if (gameType === '1vn') {
    if (selectedPlayers.length !== 2) {
      return { isValid: false, error: '1:N 게임에서는 두 명을 선택해야 합니다.' }
    }
  }

  return { isValid: true }
}

// 메시지 전송 처리 함수
export async function handleMessageSend(
  content: string,
  gameId: string,
  playerLabel: PlayerLabel,
  onSuccess?: () => void,
  onError?: (error: string) => void
) {
  try {
    // 입력 검증
    const validation = validateMessage(content)
    if (!validation.isValid) {
      onError?.(validation.error!)
      return { success: false, error: validation.error }
    }

    // Supabase에 메시지 전송
    await sendMessageToGame(gameId, playerLabel, content.trim())
    
    onSuccess?.()
    return { success: true }
  } catch (error) {
    console.error('Failed to send message:', error)
    const errorMessage = error instanceof Error ? error.message : '메시지 전송에 실패했습니다.'
    onError?.(errorMessage)
    return { success: false, error: errorMessage }
  }
}

// 투표 제출 처리 함수
export async function handleVoteSubmit(
  selectedPlayers: string[],
  gameId: string,
  playerLabel: PlayerLabel,
  gameType: '1v1' | '1vn',
  voteType?: 'ai' | 'human',
  onSuccess?: () => void,
  onError?: (error: string) => void
) {
  try {
    // 투표 검증
    const validation = validateVote(selectedPlayers, gameType, playerLabel)
    if (!validation.isValid) {
      onError?.(validation.error!)
      return { success: false, error: validation.error }
    }

    // 1:1 게임에서 AI/Human 선택 검증
    if (gameType === '1v1' && !voteType) {
      onError?.('AI 또는 Human을 선택해주세요.')
      return { success: false, error: 'AI 또는 Human을 선택해주세요.' }
    }

    // Supabase에 투표 전송
    if (gameType === '1v1') {
      // 1:1 게임: AI/Human 선택과 함께 투표
      await submitVoteToGame(gameId, playerLabel, selectedPlayers[0], voteType)
    } else {
      // 1:N 게임: 두 명에게 각각 투표
      for (const votedPlayer of selectedPlayers) {
        await submitVoteToGame(gameId, playerLabel, votedPlayer)
      }
    }
    
    onSuccess?.()
    return { success: true }
  } catch (error) {
    console.error('Failed to submit vote:', error)
    const errorMessage = error instanceof Error ? error.message : '투표 제출에 실패했습니다.'
    onError?.(errorMessage)
    return { success: false, error: errorMessage }
  }
}

// 게임 상태 변경 처리 함수
export async function handleGameStatusChange(
  gameId: string,
  newStatus: GameStatus,
  timeRemaining?: number,
  onSuccess?: () => void,
  onError?: (error: string) => void
) {
  try {
    await updateGameStatus(gameId, newStatus, timeRemaining)
    onSuccess?.()
    return { success: true }
  } catch (error) {
    console.error('Failed to update game status:', error)
    const errorMessage = error instanceof Error ? error.message : '게임 상태 업데이트에 실패했습니다.'
    onError?.(errorMessage)
    return { success: false, error: errorMessage }
  }
}

// 입력 디바운싱 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 입력 스로틀링 함수
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 에러 메시지 포맷팅
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (error?.message) {
    return error.message
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

// 성공 메시지 포맷팅
export function formatSuccessMessage(action: string): string {
  const messages = {
    message: '메시지가 전송되었습니다.',
    vote: '투표가 제출되었습니다.',
    status: '게임 상태가 업데이트되었습니다.'
  }
  
  return messages[action as keyof typeof messages] || '작업이 완료되었습니다.'
}
