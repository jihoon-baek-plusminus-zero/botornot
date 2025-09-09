import { ChatRoomManager } from './chatRoomManager'
import { ChatRoom } from '@/types/chat'
import fs from 'fs'
import path from 'path'

// 파일 기반 채팅방 저장소
class ChatRoomStore {
  private static instance: ChatRoomStore
  private storagePath: string

  private constructor() {
    this.storagePath = path.join(process.cwd(), 'data', 'chatrooms')
    this.ensureStorageDirectory()
  }

  public static getInstance(): ChatRoomStore {
    if (!ChatRoomStore.instance) {
      ChatRoomStore.instance = new ChatRoomStore()
    }
    return ChatRoomStore.instance
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true })
    }
  }

  private getRoomFilePath(roomId: string): string {
    return path.join(this.storagePath, `${roomId}.json`)
  }

  public setRoom(roomId: string, roomManager: ChatRoomManager): void {
    try {
      const roomData = roomManager.getRoomState()
      const filePath = this.getRoomFilePath(roomId)
      fs.writeFileSync(filePath, JSON.stringify(roomData, null, 2))
      console.log(`채팅방 저장됨: ${roomId}`)
    } catch (error) {
      console.error(`채팅방 저장 실패: ${roomId}`, error)
    }
  }

  public getRoom(roomId: string): ChatRoomManager | null {
    try {
      const filePath = this.getRoomFilePath(roomId)
      if (!fs.existsSync(filePath)) {
        console.log(`채팅방 파일 없음: ${roomId}`)
        return null
      }

      const roomData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      console.log(`채팅방 조회 성공: ${roomId}`)
      
      // ChatRoomManager 인스턴스 재생성
      const roomManager = new ChatRoomManager(roomData.totalPlayers, roomData.players.map((p: any) => p.type))
      // 기존 상태 복원
      roomManager.room = roomData
      return roomManager
    } catch (error) {
      console.error(`채팅방 조회 실패: ${roomId}`, error)
      return null
    }
  }

  public deleteRoom(roomId: string): boolean {
    try {
      const filePath = this.getRoomFilePath(roomId)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`채팅방 삭제됨: ${roomId}`)
        return true
      }
      return false
    } catch (error) {
      console.error(`채팅방 삭제 실패: ${roomId}`, error)
      return false
    }
  }

  public getAllRoomIds(): string[] {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return []
      }
      return fs.readdirSync(this.storagePath)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error)
      return []
    }
  }
}

export const chatRoomStore = ChatRoomStore.getInstance()
