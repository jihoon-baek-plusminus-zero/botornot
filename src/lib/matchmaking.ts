import { createServerClient } from './supabase'
import { getRandomTopic, getRandomAIPersona } from './game-api'
import { 
  QueueEntry, 
  MatchResult, 
  MatchmakingPlayer, 
  MatchingCriteria,
  QueueType,
  PlayerLabel,
  MatchmakingStatus
} from '@/types/matchmaking'
import { GameType } from '@/types/game'
import { generateId } from './utils'

// 매칭 조건 설정
const MATCHING_CRITERIA: Record<QueueType, MatchingCriteria> = {
  '1v1': {
    queueType: '1v1',
    minPlayers: 2,
    maxPlayers: 2,
    maxWaitTime: 90, // 90초
    aiPlayerRatio: 0.5 // 50% 확률로 AI 플레이어
  },
  '1vn': {
    queueType: '1vn',
    minPlayers: 3,
    maxPlayers: 5,
    maxWaitTime: 120, // 120초
    aiPlayerRatio: 0.6 // 60% 확률로 AI 플레이어
  }
}

// 대기열 관리 (메모리 기반, 실제로는 Redis나 DB 사용 권장)
const queues: Map<QueueType, QueueEntry[]> = new Map()
const activeGames: Map<string, MatchResult> = new Map()

// 대기열 초기화
queues.set('1v1', [])
queues.set('1vn', [])



/**
 * 대기열에 플레이어 추가
 */
export async function addPlayerToQueue(
  queueType: QueueType,
  playerLabel: PlayerLabel,
  isAI: boolean = false,
  aiPersonaId?: number
): Promise<QueueEntry> {
  const supabase = createServerClient()
  
  const queueEntry: QueueEntry = {
    id: generateId(),
    playerId: generateId(),
    playerLabel,
    queueType,
    joinedAt: new Date().toISOString(),
    status: 'waiting'
  }

  // 대기열에 추가
  const currentQueue = queues.get(queueType) || []
  currentQueue.push(queueEntry)
  queues.set(queueType, currentQueue)

  // DB에 대기열 엔트리 저장 (선택사항)
  try {
    await supabase
      .from('queue_entries')
      .insert({
        id: queueEntry.id,
        player_id: queueEntry.playerId,
        player_label: queueEntry.playerLabel,
        queue_type: queueType,
        joined_at: queueEntry.joinedAt,
        status: queueEntry.status
      })
  } catch (error) {
    console.error('Failed to save queue entry to DB:', error)
  }

  return queueEntry
}

/**
 * 대기열에서 플레이어 제거
 */
export async function removePlayerFromQueue(
  queueType: QueueType,
  playerId: string
): Promise<boolean> {
  const supabase = createServerClient()
  
  const currentQueue = queues.get(queueType) || []
  const updatedQueue = currentQueue.filter(entry => entry.playerId !== playerId)
  queues.set(queueType, updatedQueue)

  // DB에서도 제거
  try {
    await supabase
      .from('queue_entries')
      .delete()
      .eq('player_id', playerId)
  } catch (error) {
    console.error('Failed to remove queue entry from DB:', error)
  }

  return true
}

/**
 * 매칭 가능한 플레이어들 찾기
 */
function findMatchingPlayers(
  queueType: QueueType,
  currentPlayer: QueueEntry
): QueueEntry[] {
  const criteria = MATCHING_CRITERIA[queueType]
  const currentQueue = queues.get(queueType) || []
  
  // 현재 플레이어를 제외한 대기열
  const otherPlayers = currentQueue.filter(p => p.playerId !== currentPlayer.playerId)
  
  if (queueType === '1v1') {
    // 1:1 게임: 다른 플레이어 1명만 필요
    if (otherPlayers.length >= 1) {
      return [currentPlayer, otherPlayers[0]]
    }
  } else if (queueType === '1vn') {
    // 1:N 게임: 최소 3명, 최대 5명
    if (otherPlayers.length >= criteria.minPlayers - 1) {
      const selectedPlayers = otherPlayers.slice(0, criteria.maxPlayers - 1)
      return [currentPlayer, ...selectedPlayers]
    }
  }
  
  return []
}

/**
 * AI 플레이어 생성
 */
async function generateAIPlayers(
  count: number,
  existingPlayers: MatchmakingPlayer[]
): Promise<MatchmakingPlayer[]> {
  const aiPlayers: MatchmakingPlayer[] = []
  const usedLabels = existingPlayers.map(p => p.playerLabel)
  const availableLabels: PlayerLabel[] = ['A', 'B', 'C', 'D', 'E'].filter(
    label => !usedLabels.includes(label)
  ) as PlayerLabel[]

  for (let i = 0; i < count && i < availableLabels.length; i++) {
    const aiPersona = await getRandomAIPersona()
    aiPlayers.push({
      id: generateId(),
      playerLabel: availableLabels[i],
      joinedAt: new Date().toISOString(),
      isAI: true,
      aiPersonaId: aiPersona.id
    })
  }

  return aiPlayers
}

/**
 * 게임 생성
 */
async function createGame(
  players: MatchmakingPlayer[],
  gameType: GameType
): Promise<MatchResult> {
  const supabase = createServerClient()
  
  // 게임 ID 생성
  const gameId = generateId()
  
  // 랜덤 주제 선택
  const topic = await getRandomTopic()
  
  // 게임 생성
  const gameData = {
    id: gameId,
    type: gameType,
    status: 'waiting',
    topic_id: topic.id,
    created_at: new Date().toISOString(),
    time_remaining: gameType === '1v1' ? 120 : 300, // 2분 또는 5분
    turn_time_remaining: 10
  }

  try {
    await supabase.from('games').insert(gameData)
  } catch (error) {
    console.error('Failed to create game:', error)
    throw new Error('게임 생성에 실패했습니다.')
  }

  // 플레이어들을 게임에 추가
  for (const player of players) {
    const playerData = {
      game_id: gameId,
      player_label: player.playerLabel,
      is_ai: player.isAI,
      ai_persona_id: player.aiPersonaId,
      status: 'active',
      joined_at: player.joinedAt
    }

    try {
      await supabase.from('players').insert(playerData)
    } catch (error) {
      console.error('Failed to add player to game:', error)
    }
  }

  const matchResult: MatchResult = {
    gameId,
    gameType,
    players,
    matchedAt: new Date().toISOString(),
    topicId: topic.id
  }

  // 활성 게임에 추가
  activeGames.set(gameId, matchResult)

  return matchResult
}

/**
 * 매칭 알고리즘 실행
 */
export async function attemptMatching(
  queueType: QueueType,
  currentPlayer: QueueEntry
): Promise<MatchResult | null> {
  const criteria = MATCHING_CRITERIA[queueType]
  const matchingPlayers = findMatchingPlayers(queueType, currentPlayer)
  
  if (matchingPlayers.length < criteria.minPlayers) {
    return null
  }

  // 대기 시간 확인
  const now = new Date()
  const oldestPlayer = matchingPlayers.reduce((oldest, current) => {
    return new Date(current.joinedAt) < new Date(oldest.joinedAt) ? current : oldest
  })
  
  const waitTime = (now.getTime() - new Date(oldestPlayer.joinedAt).getTime()) / 1000
  if (waitTime > criteria.maxWaitTime) {
    // 대기 시간 초과 시 AI 플레이어로 채움
    return await createGameWithAI(queueType, matchingPlayers)
  }

  // 즉시 매칭 가능한 경우
  if (matchingPlayers.length >= criteria.minPlayers) {
    // AI 플레이어 필요 여부 결정
    const shouldAddAI = Math.random() < criteria.aiPlayerRatio
    let finalPlayers = matchingPlayers.map(p => ({
      id: p.playerId,
      playerLabel: p.playerLabel,
      joinedAt: p.joinedAt,
      isAI: false
    }))

    if (shouldAddAI && finalPlayers.length < criteria.maxPlayers) {
      const aiPlayers = await generateAIPlayers(
        criteria.maxPlayers - finalPlayers.length,
        finalPlayers
      )
      finalPlayers = [...finalPlayers, ...aiPlayers]
    }

    // 매칭된 플레이어들을 대기열에서 제거
    for (const player of matchingPlayers) {
      await removePlayerFromQueue(queueType, player.playerId)
    }

    // 게임 생성
    const gameType: GameType = queueType === '1v1' ? '1v1' : '1vn'
    return await createGame(finalPlayers, gameType)
  }

  return null
}

/**
 * AI 플레이어로 게임 생성 (대기 시간 초과 시)
 */
async function createGameWithAI(
  queueType: QueueType,
  humanPlayers: QueueEntry[]
): Promise<MatchResult> {
  const criteria = MATCHING_CRITERIA[queueType]
  
  // 인간 플레이어들을 MatchmakingPlayer로 변환
  const players: MatchmakingPlayer[] = humanPlayers.map(p => ({
    id: p.playerId,
    playerLabel: p.playerLabel,
    joinedAt: p.joinedAt,
    isAI: false
  }))

  // AI 플레이어 생성
  const aiPlayers = await generateAIPlayers(
    criteria.maxPlayers - players.length,
    players
  )

  const allPlayers = [...players, ...aiPlayers]

  // 매칭된 플레이어들을 대기열에서 제거
  for (const player of humanPlayers) {
    await removePlayerFromQueue(queueType, player.playerId)
  }

  // 게임 생성
  const gameType: GameType = queueType === '1v1' ? '1v1' : '1vn'
  return await createGame(allPlayers, gameType)
}

/**
 * 대기열 통계 계산
 */
export function getQueueStats(queueType: QueueType) {
  const currentQueue = queues.get(queueType) || []
  const now = new Date()
  
  const averageWaitTime = currentQueue.length > 0 
    ? currentQueue.reduce((sum, entry) => {
        const waitTime = (now.getTime() - new Date(entry.joinedAt).getTime()) / 1000
        return sum + waitTime
      }, 0) / currentQueue.length
    : 0

  return {
    queueType,
    waitingPlayers: currentQueue.length,
    averageWaitTime: Math.round(averageWaitTime),
    estimatedWaitTime: Math.min(averageWaitTime * 1.5, MATCHING_CRITERIA[queueType].maxWaitTime)
  }
}

/**
 * 주기적으로 매칭 시도 (백그라운드 작업)
 */
export async function processMatchmaking() {
  for (const [queueType, queue] of queues.entries()) {
    if (queue.length === 0) continue

    const criteria = MATCHING_CRITERIA[queueType]
    const now = new Date()

    // 대기 시간이 초과된 플레이어들 찾기
    const timeoutPlayers = queue.filter(entry => {
      const waitTime = (now.getTime() - new Date(entry.joinedAt).getTime()) / 1000
      return waitTime > criteria.maxWaitTime
    })

    // 타임아웃된 플레이어들로 게임 생성
    for (const player of timeoutPlayers) {
      try {
        await createGameWithAI(queueType, [player])
      } catch (error) {
        console.error('Failed to create game for timeout player:', error)
      }
    }

    // 일반 매칭 시도
    for (const player of queue) {
      if (player.status === 'waiting') {
        try {
          const matchResult = await attemptMatching(queueType, player)
          if (matchResult) {
            // 매칭 성공 시 상태 업데이트
            player.status = 'matched'
            player.gameId = matchResult.gameId
          }
        } catch (error) {
          console.error('Failed to attempt matching:', error)
        }
      }
    }
  }
}

/**
 * 게임 정보 조회
 */
export function getGameInfo(gameId: string): MatchResult | null {
  return activeGames.get(gameId) || null
}

/**
 * 게임 완료 시 정리
 */
export function cleanupGame(gameId: string) {
  activeGames.delete(gameId)
}
