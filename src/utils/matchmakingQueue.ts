import fs from 'fs'
import path from 'path'
import { ChatRoomManager } from './chatRoomManager'
import { chatRoomStore } from './chatRoomStore'

interface QueueUser {
  id: string
  sessionId: string
  joinedAt: number
  matched: boolean
  roomId?: string
  playerId?: number
}

interface MatchmakingQueue {
  users: QueueUser[]
  currentPosition: number
  lastMatchTime: number
  matchedUsers: { [sessionId: string]: { roomId: string; playerId: number; matchType: 'human-human' | 'human-ai'; matchedAt: number } }
}

class MatchmakingQueueManager {
  private static instance: MatchmakingQueueManager
  private queue: MatchmakingQueue
  private dataPath: string

  private constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'matchmaking-1v1.json')
    this.queue = this.loadQueue()
  }

  public static getInstance(): MatchmakingQueueManager {
    if (!MatchmakingQueueManager.instance) {
      MatchmakingQueueManager.instance = new MatchmakingQueueManager()
    }
    return MatchmakingQueueManager.instance
  }

  private loadQueue(): MatchmakingQueue {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8')
        const loadedQueue: MatchmakingQueue = JSON.parse(data)
        // Ensure matchedUsers exists, even if loaded from an old file format
        if (!loadedQueue.matchedUsers) {
          loadedQueue.matchedUsers = {}
        }
        return loadedQueue
      }
    } catch (error) {
      console.error('매치메이킹 큐 로드 오류:', error)
    }

    return {
      users: [],
      currentPosition: 1,
      lastMatchTime: 0,
      matchedUsers: {}
    }
  }

  private saveQueue(): void {
    try {
      // data 디렉토리가 없으면 생성
      const dataDir = path.dirname(this.dataPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      fs.writeFileSync(this.dataPath, JSON.stringify(this.queue, null, 2))
    } catch (error) {
      console.error('매치메이킹 큐 저장 오류:', error)
    }
  }

  public joinQueue(sessionId: string): { position: number; userId: string } {
    // 먼저 매칭된 사용자 목록에서 확인 (이미 매칭된 경우)
    if (this.queue.matchedUsers[sessionId]) {
      const matchInfo = this.queue.matchedUsers[sessionId]
      // 이미 매칭된 사용자는 큐에 다시 추가하지 않고 매칭 정보 반환
      return { position: 0, userId: `matched_${sessionId}` } // userId는 임시로 설정
    }

    // 이미 큐에 있는지 확인
    const existingUser = this.queue.users.find(user => user.sessionId === sessionId)
    if (existingUser && !existingUser.matched) {
      const position = this.queue.users.indexOf(existingUser) + 1
      return { position, userId: existingUser.id }
    }

    // 새 사용자 추가
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newUser: QueueUser = {
      id: userId,
      sessionId,
      joinedAt: Date.now(),
      matched: false
    }

    this.queue.users.push(newUser)
    this.saveQueue()

    const position = this.queue.users.length
    console.log(`1:1 큐 참가: ${userId}, 위치: ${position}`)

    // 매칭 시도
    this.tryMatching()

    return { position, userId }
  }

  public getQueueStatus(sessionId: string): { position: number; matched: boolean; roomId?: string; playerId?: number; matchType?: 'human-human' | 'human-ai' } {
    // 먼저 매칭된 사용자 목록에서 확인
    if (this.queue.matchedUsers[sessionId]) {
      const matchInfo = this.queue.matchedUsers[sessionId]
      return {
        position: 0, // 매칭된 사용자는 큐에 없으므로 0으로 표시
        matched: true,
        roomId: matchInfo.roomId,
        playerId: matchInfo.playerId,
        matchType: matchInfo.matchType
      }
    }

    // 큐에서 사용자 찾기
    const user = this.queue.users.find(u => u.sessionId === sessionId)
    if (!user) {
      // 사용자가 큐에도 없고, 매칭된 사용자 목록에도 없으면 매칭되지 않은 상태
      return { position: 0, matched: false }
    }

    return {
      position: this.queue.users.indexOf(user) + 1,
      matched: user.matched,
      roomId: user.roomId,
      playerId: user.playerId
    }
  }

  private tryMatching(): void {
    const unmatchedUsers = this.queue.users.filter(user => !user.matched)
    
    console.log(`매칭 시도: ${unmatchedUsers.length}명의 매칭되지 않은 사용자`)
    
    if (unmatchedUsers.length === 0) {
      return // 매칭할 사용자 없음
    }
    
    // 1명만 있으면 대기 (AI 매칭 안함)
    if (unmatchedUsers.length === 1) {
      console.log(`1명 대기 중: ${unmatchedUsers[0].id} - 2번째 사용자 대기`)
      return
    }
    
    // 2명 이상이면 매칭 시작
    this.processMatching(unmatchedUsers)
  }

  private processMatching(users: QueueUser[]): void {
    let currentIndex = 0
    
    while (currentIndex < users.length) {
      const currentUser = users[currentIndex]
      const userPosition = this.getUserPosition(currentUser)
      
      if (this.isOddPosition(userPosition)) {
        // 홀수 번째 사용자: AI와 매칭
        console.log(`홀수 번째 사용자 AI 매칭: ${currentUser.id} (위치: ${userPosition})`)
        this.createHumanVsAIRoom(currentUser)
        currentIndex++
      } else {
        // 짝수 번째 사용자: 다음 사용자와 사람-사람 매칭
        if (currentIndex + 1 < users.length) {
          const nextUser = users[currentIndex + 1]
          console.log(`짝수 번째 사용자 사람-사람 매칭: ${currentUser.id}, ${nextUser.id} (위치: ${userPosition}, ${userPosition + 1})`)
          this.createHumanVsHumanRoom(currentUser, nextUser)
          currentIndex += 2
        } else {
          // 짝수 번째인데 다음 사용자가 없으면 대기
          console.log(`짝수 번째 사용자 대기: ${currentUser.id} (위치: ${userPosition}) - 다음 사용자 대기`)
          break
        }
      }
    }
  }

  private getUserPosition(user: QueueUser): number {
    // 사용자의 전체 순서 계산 (매칭된 사용자 포함)
    const totalMatched = Object.keys(this.queue.matchedUsers).length
    const currentQueueIndex = this.queue.users.indexOf(user)
    return totalMatched + currentQueueIndex + 1
  }

  private isOddPosition(position: number): boolean {
    return position % 2 === 1
  }

  private createHumanVsHumanRoom(user1: QueueUser, user2: QueueUser): void {
    // 기존 채팅방 생성 로직 사용
    const chatRoomManager = new ChatRoomManager(2, ['human', 'human'])
    
    const roomId = chatRoomManager.room.id
    
    // 채팅방 저장
    chatRoomStore.setRoom(roomId, chatRoomManager)
    
    // 사용자들에게 매칭 정보 설정
    user1.matched = true
    user1.roomId = roomId
    user1.playerId = 0

    user2.matched = true
    user2.roomId = roomId
    user2.playerId = 1

    // 매칭된 사용자 정보를 별도 저장
    this.queue.matchedUsers[user1.sessionId] = { roomId, playerId: 0, matchType: 'human-human', matchedAt: Date.now() }
    this.queue.matchedUsers[user2.sessionId] = { roomId, playerId: 1, matchType: 'human-human', matchedAt: Date.now() }

    console.log(`1:1 매칭 완료 (사람 vs 사람): ${user1.id} + ${user2.id} → ${roomId}`)
  }

  private createHumanVsAIRoom(user: QueueUser): void {
    // 기존 채팅방 생성 로직 사용
    const chatRoomManager = new ChatRoomManager(2, ['human', 'ai'])
    
    const roomId = chatRoomManager.room.id
    
    // 채팅방 저장
    chatRoomStore.setRoom(roomId, chatRoomManager)
    
    // 사용자에게 매칭 정보 설정
    user.matched = true
    user.roomId = roomId
    user.playerId = 0

    // 매칭된 사용자 정보를 별도 저장
    this.queue.matchedUsers[user.sessionId] = { roomId, playerId: 0, matchType: 'human-ai', matchedAt: Date.now() }

    console.log(`1:AI 매칭 완료 (사람 vs AI): ${user.id} → ${roomId}`)
  }

  private removeMatchedUsers(userIds: string[]): void {
    // userIds는 실제로는 user.id 배열이므로, sessionId로 변환해서 제거
    const usersToRemove = this.queue.users.filter(user => userIds.includes(user.id))
    const sessionIdsToRemove = usersToRemove.map(user => user.sessionId)
    
    // 큐에서 사용자 제거
    this.queue.users = this.queue.users.filter(user => !userIds.includes(user.id))
    
    // 매칭된 사용자 정보는 유지 (클라이언트가 매칭 상태를 확인할 수 있도록)
    // sessionIdsToRemove.forEach(sessionId => {
    //   delete this.queue.matchedUsers[sessionId]
    // })
    
    this.saveQueue()
    console.log(`매칭된 사용자들 큐에서 제거: ${userIds.join(', ')}`)
  }

  public leaveQueue(sessionId: string): void {
    this.queue.users = this.queue.users.filter(user => user.sessionId !== sessionId)
    // 매칭된 사용자 정보도 제거
    delete this.queue.matchedUsers[sessionId]
    this.saveQueue()
    console.log(`1:1 큐에서 나감: ${sessionId}`)
  }

  public clearMatchedUser(sessionId: string): void {
    delete this.queue.matchedUsers[sessionId]
    this.saveQueue()
    console.log(`매칭된 사용자 정보 정리: ${sessionId}`)
  }

  public getQueueInfo(): { totalUsers: number; unmatchedUsers: number } {
    return {
      totalUsers: this.queue.users.length + Object.keys(this.queue.matchedUsers).length, // Include matched users in total
      unmatchedUsers: this.queue.users.filter(user => !user.matched).length
    }
  }
}

export const matchmakingQueueManager = MatchmakingQueueManager.getInstance()
