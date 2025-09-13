import fs from 'fs'
import path from 'path'

export interface MatchedUser {
  sessionId: string
  roomId: string
  tag: 'A' | 'B' | 'C'
  matchedAt: Date
  actualRoomId?: string // 실제 채팅방 ID
  playerId: number // 플레이어 ID (0 또는 1)
}

export interface MatchedUsersData {
  users: MatchedUser[]
  lastUpdated: Date
}

class MatchedUsersStore {
  private storeFilePath: string
  private store: MatchedUsersData

  constructor() {
    this.storeFilePath = path.join(process.cwd(), 'data', 'matched_users.json')
    this.store = this.loadStore()
  }

  private loadStore(): MatchedUsersData {
    try {
      if (fs.existsSync(this.storeFilePath)) {
        const data = fs.readFileSync(this.storeFilePath, 'utf8')
        const parsed = JSON.parse(data)
        // Date 객체 복원
        parsed.users.forEach((user: any) => {
          user.matchedAt = new Date(user.matchedAt)
        })
        parsed.lastUpdated = new Date(parsed.lastUpdated)
        return parsed
      }
    } catch (error) {
      console.error('매칭된 사용자 저장소 로드 오류:', error)
    }

    return {
      users: [],
      lastUpdated: new Date()
    }
  }

  private saveStore(): void {
    try {
      // data 디렉토리가 없으면 생성
      const dataDir = path.dirname(this.storeFilePath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.store.lastUpdated = new Date()
      fs.writeFileSync(this.storeFilePath, JSON.stringify(this.store, null, 2))
    } catch (error) {
      console.error('매칭된 사용자 저장소 저장 오류:', error)
    }
  }

  public addMatchedUser(sessionId: string, roomId: string, tag: 'A' | 'B' | 'C', playerId: number, actualRoomId?: string): void {
    // 기존 매칭 정보가 있으면 제거
    this.removeMatchedUser(sessionId)

    const matchedUser: MatchedUser = {
      sessionId,
      roomId,
      tag,
      matchedAt: new Date(),
      playerId,
      actualRoomId
    }

    this.store.users.push(matchedUser)
    this.saveStore()
  }

  public removeMatchedUser(sessionId: string): boolean {
    const initialLength = this.store.users.length
    this.store.users = this.store.users.filter(user => user.sessionId !== sessionId)
    
    if (this.store.users.length !== initialLength) {
      this.saveStore()
      return true
    }
    return false
  }

  public getMatchedUser(sessionId: string): MatchedUser | null {
    return this.store.users.find(user => user.sessionId === sessionId) || null
  }

  public getMatchedUsersByRoom(roomId: string): MatchedUser[] {
    return this.store.users.filter(user => user.roomId === roomId)
  }

  public updateActualRoomId(sessionId: string, actualRoomId: string): void {
    const user = this.store.users.find(u => u.sessionId === sessionId)
    if (user) {
      user.actualRoomId = actualRoomId
      this.saveStore()
    }
  }

  public getAllMatchedUsers(): MatchedUser[] {
    return [...this.store.users]
  }

  public clearExpiredMatches(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    const initialLength = this.store.users.length
    this.store.users = this.store.users.filter(user => user.matchedAt > cutoffTime)
    
    if (this.store.users.length !== initialLength) {
      this.saveStore()
    }
  }
}

// 싱글톤 인스턴스
export const matchedUsersStore = new MatchedUsersStore()
