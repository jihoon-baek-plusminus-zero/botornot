import fs from 'fs'
import path from 'path'

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
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('매치메이킹 큐 로드 오류:', error)
    }

    return {
      users: [],
      currentPosition: 1,
      lastMatchTime: 0
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

  public getQueueStatus(sessionId: string): { position: number; matched: boolean; roomId?: string; playerId?: number } {
    const user = this.queue.users.find(u => u.sessionId === sessionId)
    if (!user) {
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
    
    if (unmatchedUsers.length >= 3) {
      // 1-2번 매칭 (사람 vs 사람)
      const user1 = unmatchedUsers[0]
      const user2 = unmatchedUsers[1]
      
      // 3번은 AI와 매칭
      const user3 = unmatchedUsers[2]

      // 1:1 대화방 생성 (사람 vs 사람)
      this.createHumanVsHumanRoom(user1, user2)
      
      // 1:AI 대화방 생성 (사람 vs AI)
      this.createHumanVsAIRoom(user3)

      // 매칭된 사용자들을 큐에서 제거
      this.removeMatchedUsers([user1.id, user2.id, user3.id])
    }
  }

  private createHumanVsHumanRoom(user1: QueueUser, user2: QueueUser): void {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 기존 채팅방 생성 로직 사용
    const { ChatRoomManager } = require('./chatRoomManager')
    const chatRoomManager = new ChatRoomManager(roomId)
    
    // 사람 vs 사람 채팅방 생성
    chatRoomManager.initializeRoom(['human', 'human'])
    
    // 사용자들에게 매칭 정보 설정
    user1.matched = true
    user1.roomId = roomId
    user1.playerId = 0

    user2.matched = true
    user2.roomId = roomId
    user2.playerId = 1

    console.log(`1:1 매칭 완료 (사람 vs 사람): ${user1.id} + ${user2.id} → ${roomId}`)
  }

  private createHumanVsAIRoom(user: QueueUser): void {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 기존 채팅방 생성 로직 사용
    const { ChatRoomManager } = require('./chatRoomManager')
    const chatRoomManager = new ChatRoomManager(roomId)
    
    // 사람 vs AI 채팅방 생성
    chatRoomManager.initializeRoom(['human', 'ai'])
    
    // 사용자에게 매칭 정보 설정
    user.matched = true
    user.roomId = roomId
    user.playerId = 0

    console.log(`1:AI 매칭 완료 (사람 vs AI): ${user.id} → ${roomId}`)
  }

  private removeMatchedUsers(userIds: string[]): void {
    this.queue.users = this.queue.users.filter(user => !userIds.includes(user.id))
    this.saveQueue()
  }

  public leaveQueue(sessionId: string): void {
    this.queue.users = this.queue.users.filter(user => user.sessionId !== sessionId)
    this.saveQueue()
    console.log(`1:1 큐에서 나감: ${sessionId}`)
  }

  public getQueueInfo(): { totalUsers: number; unmatchedUsers: number } {
    return {
      totalUsers: this.queue.users.length,
      unmatchedUsers: this.queue.users.filter(user => !user.matched).length
    }
  }
}

export default MatchmakingQueueManager
