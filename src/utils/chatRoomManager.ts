import { Player, ChatRoom, ChatMessage, PlayerType } from '@/types/chat'

export class ChatRoomManager {
  private room: ChatRoom

  constructor(totalPlayers: number, playerTypes: PlayerType[]) {
    this.room = this.initializeRoom(totalPlayers, playerTypes)
  }

  private initializeRoom(totalPlayers: number, playerTypes: PlayerType[]): ChatRoom {
    // 프로필 이름 생성 (Player A, B, C, D, E)
    const profileNames = ['Player A', 'Player B', 'Player C', 'Player D', 'Player E']
    const availableProfiles = profileNames.slice(0, totalPlayers)
    
    // 프로필 이름 랜덤 섞기
    const shuffledProfiles = this.shuffleArray([...availableProfiles])

    // 플레이어 생성
    const players: Player[] = playerTypes.map((type, index) => ({
      id: index,
      type,
      profileName: shuffledProfiles[index],
      isActive: index === 0 // 첫 번째 플레이어가 시작
    }))

    return {
      id: this.generateRoomId(),
      totalPlayers,
      players,
      messages: [],
      currentTurn: 0, // Player A부터 시작
      isGameStarted: false,
      turnOrder: shuffledProfiles
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 게임 시작
  startGame(): ChatRoom {
    this.room.isGameStarted = true
    this.room.currentTurn = 0
    this.room.players.forEach((player, index) => {
      player.isActive = index === 0
    })
    return this.room
  }

  // 다음 차례로 이동
  nextTurn(): ChatRoom {
    const currentPlayerIndex = this.room.players.findIndex(p => p.id === this.room.currentTurn)
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.room.totalPlayers
    
    // 현재 플레이어 비활성화
    this.room.players[currentPlayerIndex].isActive = false
    
    // 다음 플레이어 활성화
    this.room.players[nextPlayerIndex].isActive = true
    this.room.currentTurn = this.room.players[nextPlayerIndex].id

    return this.room
  }

  // 메시지 추가
  addMessage(playerId: number, content: string): ChatMessage {
    const player = this.room.players.find(p => p.id === playerId)
    if (!player) {
      throw new Error(`Player with id ${playerId} not found`)
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      playerId,
      profileName: player.profileName,
      content,
      timestamp: new Date(),
      type: player.type
    }

    this.room.messages.push(message)
    return message
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 현재 차례인 플레이어 정보
  getCurrentPlayer(): Player | null {
    return this.room.players.find(p => p.isActive) || null
  }

  // 특정 플레이어 정보
  getPlayer(playerId: number): Player | null {
    return this.room.players.find(p => p.id === playerId) || null
  }

  // 채팅방 상태 반환
  getRoomState(): ChatRoom {
    return { ...this.room }
  }

  // AI용 대화 내역 포맷 생성
  generateAIContext(playerId: number): string {
    const player = this.getPlayer(playerId)
    if (!player) {
      throw new Error(`Player with id ${playerId} not found`)
    }

    let context = `당신은 ${player.profileName} 입니다. 아래의 대화내용을 보고 다음 대화를 이어서 해주세요.\n\n`
    
    // 대화 내역 추가
    this.room.messages.forEach(message => {
      context += `${message.profileName}: ${message.content}\n`
    })
    
    context += `\n당신은 ${player.profileName}입니다. 이제 위의 대화내용에 답변하세요.`
    
    return context
  }

  // 플레이어가 현재 차례인지 확인
  isPlayerTurn(playerId: number): boolean {
    const player = this.getPlayer(playerId)
    return player ? player.isActive : false
  }
}
