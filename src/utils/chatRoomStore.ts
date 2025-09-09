import { ChatRoomManager } from './chatRoomManager'

// 전역 채팅방 저장소 (싱글톤 패턴)
class ChatRoomStore {
  private static instance: ChatRoomStore
  private chatRooms: Map<string, ChatRoomManager>

  private constructor() {
    this.chatRooms = new Map<string, ChatRoomManager>()
  }

  public static getInstance(): ChatRoomStore {
    if (!ChatRoomStore.instance) {
      ChatRoomStore.instance = new ChatRoomStore()
    }
    return ChatRoomStore.instance
  }

  public setRoom(roomId: string, roomManager: ChatRoomManager): void {
    this.chatRooms.set(roomId, roomManager)
    console.log(`채팅방 저장됨: ${roomId}, 총 채팅방 수: ${this.chatRooms.size}`)
  }

  public getRoom(roomId: string): ChatRoomManager | undefined {
    const room = this.chatRooms.get(roomId)
    console.log(`채팅방 조회: ${roomId}, 존재: ${!!room}`)
    return room
  }

  public deleteRoom(roomId: string): boolean {
    const deleted = this.chatRooms.delete(roomId)
    console.log(`채팅방 삭제: ${roomId}, 성공: ${deleted}`)
    return deleted
  }

  public getAllRooms(): Map<string, ChatRoomManager> {
    return this.chatRooms
  }

  public getRoomCount(): number {
    return this.chatRooms.size
  }
}

export const chatRoomStore = ChatRoomStore.getInstance()
