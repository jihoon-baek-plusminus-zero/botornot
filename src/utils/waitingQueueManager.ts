import fs from 'fs'
import path from 'path'

export interface WaitingUser {
  id: string
  sessionId: string
  joinedAt: Date
  position: number
  tag: 'A' | 'B' | 'C'
  isMatched: boolean
  roomId?: string
  canSoloMatch: boolean // 홀로 매칭 가능 여부 (1분 후)
  playerId?: number // 플레이어 ID (매칭 시 할당)
}

export interface WaitingQueue {
  users: WaitingUser[]
  lastUpdated: Date
  totalUserCount: number // 전체 입장한 사용자 수 (태그 할당용)
}

class WaitingQueueManager {
  private queueFilePath: string
  private queue: WaitingQueue

  constructor() {
    this.queueFilePath = path.join(process.cwd(), 'data', 'waiting_queue.json')
    this.queue = this.loadQueue()
  }

  private loadQueue(): WaitingQueue {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const data = fs.readFileSync(this.queueFilePath, 'utf8')
        const parsed = JSON.parse(data)
        // Date 객체 복원
        parsed.users.forEach((user: any) => {
          user.joinedAt = new Date(user.joinedAt)
        })
        parsed.lastUpdated = new Date(parsed.lastUpdated)
        
        // 기존 데이터와의 호환성을 위해 totalUserCount 초기화
        if (parsed.totalUserCount === undefined) {
          parsed.totalUserCount = parsed.users.length
        }
        
        return parsed
      }
    } catch (error) {
      console.error('대기열 로드 오류:', error)
    }

    return {
      users: [],
      lastUpdated: new Date(),
      totalUserCount: 0
    }
  }

  private saveQueue(): void {
    try {
      // data 디렉토리가 없으면 생성
      const dataDir = path.dirname(this.queueFilePath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.queue.lastUpdated = new Date()
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.queue, null, 2))
    } catch (error) {
      console.error('대기열 저장 오류:', error)
    }
  }

  private generateTag(position: number): 'A' | 'B' | 'C' {
    const tagIndex = (position - 1) % 3
    return ['A', 'B', 'C'][tagIndex] as 'A' | 'B' | 'C'
  }

  private updatePositions(): void {
    this.queue.users.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
    this.queue.users.forEach((user, index) => {
      user.position = index + 1
      // 태그는 입장 순서에 따라 고정되므로 재계산하지 않음
    })
  }

  public addUser(sessionId: string): WaitingUser {
    // 기존 사용자가 있으면 제거
    this.removeUser(sessionId)

    // 전체 입장 순서에 따라 태그 계산 (totalUserCount + 1)
    this.queue.totalUserCount++
    const tag = this.generateTag(this.queue.totalUserCount)

    const newUser: WaitingUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      joinedAt: new Date(),
      position: 0, // 임시값, updatePositions에서 계산됨
      tag: tag, // 입장 순서에 따라 고정된 태그
      isMatched: false,
      canSoloMatch: false // 1분 후에 홀로 매칭 가능
    }

    this.queue.users.push(newUser)
    this.updatePositions()
    this.saveQueue()

    return newUser
  }

  public removeUser(sessionId: string): boolean {
    const initialLength = this.queue.users.length
    this.queue.users = this.queue.users.filter(user => user.sessionId !== sessionId)
    
    if (this.queue.users.length !== initialLength) {
      this.updatePositions()
      this.saveQueue()
      return true
    }
    return false
  }

  public getUser(sessionId: string): WaitingUser | null {
    return this.queue.users.find(user => user.sessionId === sessionId) || null
  }

  public getQueue(): WaitingUser[] {
    return [...this.queue.users]
  }

  public getQueueLength(): number {
    return this.queue.users.length
  }

  public getNextUser(): WaitingUser | null {
    if (this.queue.users.length === 0) return null
    return this.queue.users[0] // 가장 앞에 있는 사용자
  }

  public removeNextUser(): WaitingUser | null {
    if (this.queue.users.length === 0) return null
    
    const nextUser = this.queue.users.shift()!
    this.updatePositions()
    this.saveQueue()
    
    return nextUser
  }

  public getPosition(sessionId: string): number {
    const user = this.getUser(sessionId)
    return user ? user.position : 0
  }

  public getTag(sessionId: string): 'A' | 'B' | 'C' | null {
    const user = this.getUser(sessionId)
    return user ? user.tag : null
  }

  public processMatching(): { matched: WaitingUser[], unmatched: WaitingUser[] } {
    const unmatched = this.queue.users.filter(user => !user.isMatched)
    const matched: WaitingUser[] = []

    // 매칭되지 않은 사용자들을 순서대로 정렬
    unmatched.sort((a, b) => a.position - b.position)

    // 1분 경과한 사용자들에게 홀로 매칭 허용
    const now = new Date()
    unmatched.forEach(user => {
      const waitingTime = now.getTime() - user.joinedAt.getTime()
      if (waitingTime >= 60000) { // 1분 = 60000ms
        user.canSoloMatch = true
      }
    })

    console.log('매칭 시작 - 대기열:', unmatched.map(u => `${u.position}번째(${u.tag})${u.canSoloMatch ? '[홀로매칭가능]' : '[대기중]'}`))

    let i = 0
    while (i < unmatched.length) {
      const currentUser = unmatched[i]

      if (currentUser.tag === 'C') {
        // C태그는 홀로 매칭
        currentUser.isMatched = true
        currentUser.roomId = this.generateRoomId()
        currentUser.playerId = 0 // C태그는 항상 플레이어 0
        matched.push(currentUser)
        console.log(`C태그 홀로 매칭: ${currentUser.position}번째(${currentUser.tag})`)
        i++
      } else if (currentUser.tag === 'A') {
        // A태그는 B태그와 매칭 시도
        const bUser = unmatched.find((user, index) => 
          index > i && user.tag === 'B' && !user.isMatched
        )
        
        if (bUser) {
          // A-B 매칭 성공
          currentUser.isMatched = true
          bUser.isMatched = true
          const roomId = this.generateRoomId()
          currentUser.roomId = roomId
          bUser.roomId = roomId
          currentUser.playerId = 0 // A태그는 플레이어 0
          bUser.playerId = 1 // B태그는 플레이어 1
          matched.push(currentUser, bUser)
          console.log(`A-B 매칭 성공: ${currentUser.position}번째(${currentUser.tag}) + ${bUser.position}번째(${bUser.tag})`)
          i++
        } else if (currentUser.canSoloMatch) {
          // 1분 경과 후 홀로 매칭 (AI와 대화)
          currentUser.isMatched = true
          currentUser.roomId = this.generateRoomId()
          currentUser.playerId = 0 // A태그 홀로 매칭은 플레이어 0
          matched.push(currentUser)
          console.log(`A태그 홀로 매칭 (1분 경과): ${currentUser.position}번째(${currentUser.tag}) - AI와 대화`)
          i++
        } else {
          // 1분 미경과, 대기
          const waitingTime = Math.ceil((60000 - (now.getTime() - currentUser.joinedAt.getTime())) / 1000)
          console.log(`A태그 대기: ${currentUser.position}번째(${currentUser.tag}) - ${waitingTime}초 후 홀로 매칭 가능`)
          i++
        }
      } else if (currentUser.tag === 'B') {
        // B태그는 A태그와 매칭 시도
        const aUser = unmatched.find((user, index) => 
          index > i && user.tag === 'A' && !user.isMatched
        )
        
        if (aUser) {
          // B-A 매칭 성공
          currentUser.isMatched = true
          aUser.isMatched = true
          const roomId = this.generateRoomId()
          currentUser.roomId = roomId
          aUser.roomId = roomId
          currentUser.playerId = 1 // B태그는 플레이어 1
          aUser.playerId = 0 // A태그는 플레이어 0
          matched.push(currentUser, aUser)
          console.log(`B-A 매칭 성공: ${currentUser.position}번째(${currentUser.tag}) + ${aUser.position}번째(${aUser.tag})`)
          i++
        } else if (currentUser.canSoloMatch) {
          // 1분 경과 후 홀로 매칭 (AI와 대화)
          currentUser.isMatched = true
          currentUser.roomId = this.generateRoomId()
          currentUser.playerId = 0 // B태그 홀로 매칭은 플레이어 0
          matched.push(currentUser)
          console.log(`B태그 홀로 매칭 (1분 경과): ${currentUser.position}번째(${currentUser.tag}) - AI와 대화`)
          i++
        } else {
          // 1분 미경과, 대기
          const waitingTime = Math.ceil((60000 - (now.getTime() - currentUser.joinedAt.getTime())) / 1000)
          console.log(`B태그 대기: ${currentUser.position}번째(${currentUser.tag}) - ${waitingTime}초 후 홀로 매칭 가능`)
          i++
        }
      } else {
        i++
      }
    }

    console.log(`매칭 완료: ${matched.length}명 매칭, ${unmatched.length - matched.length}명 대기 중`)

    // 매칭된 사용자들을 대기열에서 제거
    this.queue.users = this.queue.users.filter(user => !user.isMatched)
    
    // 남은 사용자들의 순서 재정렬
    this.updatePositions()
    this.saveQueue()

    return { matched, unmatched: this.queue.users }
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public getMatchedUser(sessionId: string): WaitingUser | null {
    // 매칭된 사용자 정보를 별도로 저장하거나 조회하는 로직
    // 현재는 임시로 null 반환
    return null
  }
}

// 싱글톤 인스턴스
export const waitingQueueManager = new WaitingQueueManager()
