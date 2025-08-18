import { supabase } from './supabase'
import { createServerClient } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// 실시간 이벤트 타입들
export type RealtimeEvent = 
  | 'new_message'
  | 'turn_change'
  | 'player_joined'
  | 'player_left'
  | 'vote_submitted'
  | 'game_status_change'
  | 'topic_change'

// 실시간 메시지 타입
export interface RealtimeMessage {
  id: string
  game_id: string
  player_id: string
  content: string
  created_at: string
}

// 실시간 턴 변경 타입
export interface TurnChangeEvent {
  game_id: string
  current_turn: string
  turn_time_remaining: number
}

// 실시간 플레이어 이벤트 타입
export interface PlayerEvent {
  game_id: string
  player_label: string
  player_color: string
  is_ai: boolean
  status: 'active' | 'left'
}

// 실시간 투표 이벤트 타입
export interface VoteEvent {
  game_id: string
  voter_player_id: string
  voted_for_player_id: string
}

// 실시간 게임 상태 변경 타입
export interface GameStatusEvent {
  game_id: string
  status: 'waiting' | 'active' | 'voting' | 'finished'
  time_remaining: number
}

// 실시간 주제 변경 타입
export interface TopicChangeEvent {
  game_id: string
  topic_id: number
  topic_content: string
}

// 실시간 구독 콜백 타입
export interface RealtimeCallbacks {
  onNewMessage?: (message: RealtimeMessage) => void
  onTurnChange?: (event: TurnChangeEvent) => void
  onPlayerJoined?: (event: PlayerEvent) => void
  onPlayerLeft?: (event: PlayerEvent) => void
  onVoteSubmitted?: (event: VoteEvent) => void
  onGameStatusChange?: (event: GameStatusEvent) => void
  onTopicChange?: (event: TopicChangeEvent) => void
}

// 게임 채널 구독 함수
export function subscribeToGameChannel(
  gameId: string,
  callbacks: RealtimeCallbacks
): RealtimeChannel {
  const channel = supabase.channel(`game:${gameId}`)

  // 메시지 구독
  if (callbacks.onNewMessage) {
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          callbacks.onNewMessage!(payload.new as RealtimeMessage)
        }
      )
  }

  // 게임 상태 변경 구독
  if (callbacks.onGameStatusChange) {
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          const game = payload.new as any
          callbacks.onGameStatusChange!({
            game_id: game.id,
            status: game.status,
            time_remaining: game.time_remaining || 0
          })
        }
      )
  }

  // 플레이어 상태 변경 구독
  if (callbacks.onPlayerJoined || callbacks.onPlayerLeft) {
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          const player = payload.new as any
          const event: PlayerEvent = {
            game_id: player.game_id,
            player_label: player.player_label,
            player_color: player.player_color,
            is_ai: player.is_ai,
            status: player.status
          }

          if (player.status === 'active' && callbacks.onPlayerJoined) {
            callbacks.onPlayerJoined(event)
          } else if (player.status === 'left' && callbacks.onPlayerLeft) {
            callbacks.onPlayerLeft(event)
          }
        }
      )
  }

  // 투표 구독
  if (callbacks.onVoteSubmitted) {
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          const vote = payload.new as any
          callbacks.onVoteSubmitted!({
            game_id: vote.game_id,
            voter_player_id: vote.voter_player_id,
            voted_for_player_id: vote.voted_for_player_id
          })
        }
      )
  }

  // 커스텀 이벤트 구독 (턴 변경, 주제 변경 등)
  channel
    .on('broadcast', { event: 'turn_change' }, (payload) => {
      if (callbacks.onTurnChange) {
        callbacks.onTurnChange(payload.payload as TurnChangeEvent)
      }
    })
    .on('broadcast', { event: 'topic_change' }, (payload) => {
      if (callbacks.onTopicChange) {
        callbacks.onTopicChange(payload.payload as TopicChangeEvent)
      }
    })

  return channel.subscribe()
}

// 게임 채널 구독 해제 함수
export function unsubscribeFromGameChannel(channel: RealtimeChannel) {
  supabase.removeChannel(channel)
}

// 커스텀 이벤트 브로드캐스트 함수들
export async function broadcastTurnChange(gameId: string, currentTurn: string, turnTimeRemaining: number) {
  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'turn_change',
    payload: {
      game_id: gameId,
      current_turn: currentTurn,
      turn_time_remaining: turnTimeRemaining
    }
  })
}

export async function broadcastTopicChange(gameId: string, topicId: number, topicContent: string) {
  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'topic_change',
    payload: {
      game_id: gameId,
      topic_id: topicId,
      topic_content: topicContent
    }
  })
}

export async function broadcastTurnTimerUpdate(
  gameId: string,
  data: {
    timeRemaining: number
    isWarning: boolean
  }
) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'turn_timer_update',
      payload: {
        ...data,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to broadcast turn timer update:', error)
    throw error
  }
}

// 플레이어 연결 해제 브로드캐스트
export async function broadcastPlayerDisconnect(gameId: string, disconnectEvent: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'player_disconnect',
      payload: disconnectEvent
    })
  } catch (error) {
    console.error('Failed to broadcast player disconnect:', error)
    throw error
  }
}

// 플레이어 재연결 브로드캐스트
export async function broadcastPlayerReconnect(gameId: string, reconnectEvent: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'player_reconnect',
      payload: reconnectEvent
    })
  } catch (error) {
    console.error('Failed to broadcast player reconnect:', error)
    throw error
  }
}

// 연결 해제 알림 브로드캐스트
export async function broadcastDisconnectNotification(gameId: string, notification: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'disconnect_notification',
      payload: notification
    })
  } catch (error) {
    console.error('Failed to broadcast disconnect notification:', error)
    throw error
  }
}

// 타임아웃 이벤트 브로드캐스트
export async function broadcastTimeoutEvent(gameId: string, timeoutEvent: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'timeout_event',
      payload: timeoutEvent
    })
  } catch (error) {
    console.error('Failed to broadcast timeout event:', error)
    throw error
  }
}

// 타임아웃 알림 브로드캐스트
export async function broadcastTimeoutNotification(gameId: string, notification: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'timeout_notification',
      payload: notification
    })
  } catch (error) {
    console.error('Failed to broadcast timeout notification:', error)
    throw error
  }
}

// 데이터 정리 알림 브로드캐스트
export async function broadcastCleanupNotification(gameId: string, notification: any) {
  const supabase = createServerClient()
  
  try {
    await supabase.channel(`game:${gameId}`).send({
      type: 'broadcast',
      event: 'cleanup_notification',
      payload: notification
    })
  } catch (error) {
    console.error('Failed to broadcast cleanup notification:', error)
    throw error
  }
}
