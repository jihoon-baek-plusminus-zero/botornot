import { supabase } from './supabase'
import { GameType, GameStatus, PlayerLabel } from '@/types/game'

// 메시지 전송
export async function sendMessageToGame(
  gameId: string,
  playerId: string,
  content: string
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      game_id: gameId,
      player_id: playerId,
      content: content
    })
    .select()

  if (error) {
    console.error('Error sending message:', error)
    throw error
  }

  return data[0]
}

// 투표 제출
export async function submitVoteToGame(
  gameId: string,
  voterPlayerId: string,
  votedForPlayerId: string,
  voteType?: 'ai' | 'human'
) {
  const voteData: any = {
    game_id: gameId,
    voter_player_label: voterPlayerId,
    voted_for_players: [votedForPlayerId]
  }

  // 1:1 게임에서 AI/Human 선택이 있는 경우 추가 정보 저장
  if (voteType) {
    voteData.vote_type = voteType
    voteData.confidence = voteType === 'ai' ? 0.8 : 0.2 // AI 선택 시 높은 신뢰도, Human 선택 시 낮은 신뢰도
    voteData.reasoning = voteType === 'ai' ? 'AI로 판단됨' : 'Human으로 판단됨'
  }

  const { data, error } = await supabase
    .from('votes')
    .insert(voteData)
    .select()

  if (error) {
    console.error('Error submitting vote:', error)
    throw error
  }

  return data[0]
}

// 게임 상태 업데이트
export async function updateGameStatus(
  gameId: string,
  status: GameStatus,
  timeRemaining?: number
) {
  const updateData: any = { status }
  if (timeRemaining !== undefined) {
    updateData.time_remaining = timeRemaining
  }

  const { data, error } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId)
    .select()

  if (error) {
    console.error('Error updating game status:', error)
    throw error
  }

  return data[0]
}

// 플레이어 상태 업데이트
export async function updatePlayerStatus(
  gameId: string,
  playerLabel: PlayerLabel,
  status: 'active' | 'left'
) {
  const { data, error } = await supabase
    .from('players')
    .update({ status })
    .eq('game_id', gameId)
    .eq('player_label', playerLabel)
    .select()

  if (error) {
    console.error('Error updating player status:', error)
    throw error
  }

  return data[0]
}

// 게임 생성
export async function createGame(
  gameType: GameType,
  topicId: number
) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      game_type: gameType,
      status: 'waiting',
      topic_id: topicId
    })
    .select()

  if (error) {
    console.error('Error creating game:', error)
    throw error
  }

  return data[0]
}

// 플레이어 추가
export async function addPlayerToGame(
  gameId: string,
  playerLabel: PlayerLabel,
  playerColor: string,
  isAI: boolean = false,
  personaId?: number
) {
  const { data, error } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      player_label: playerLabel,
      player_color: playerColor,
      is_ai: isAI,
      persona_id: personaId,
      status: 'active'
    })
    .select()

  if (error) {
    console.error('Error adding player:', error)
    throw error
  }

  return data[0]
}

// 게임 정보 조회
export async function getGameInfo(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      players (*),
      messages (*),
      votes (*),
      topics (*)
    `)
    .eq('id', gameId)
    .single()

  if (error) {
    console.error('Error fetching game info:', error)
    throw error
  }

  return data
}

// 랜덤 주제 조회
export async function getRandomTopic() {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('RANDOM()')
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching random topic:', error)
    throw error
  }

  return data
}

// 랜덤 AI 페르소나 조회
export async function getRandomAIPersona() {
  const { data, error } = await supabase
    .from('ai_personas')
    .select('*')
    .order('RANDOM()')
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching random AI persona:', error)
    throw error
  }

  return data
}

// 게임 메시지 조회
export async function getGameMessages(gameId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching game messages:', error)
    throw error
  }

  return data
}

// 게임 투표 조회
export async function getGameVotes(gameId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('game_id', gameId)

  if (error) {
    console.error('Error fetching game votes:', error)
    throw error
  }

  return data
}
