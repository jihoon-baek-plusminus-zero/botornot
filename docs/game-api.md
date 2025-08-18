# 게임 로직 API 문서

## 개요

게임 로직 API는 게임 진행 중 발생하는 모든 액션을 처리합니다. 메시지 전송, 투표, 턴 변경, 게임 상태 관리 등을 포함합니다.

## API 엔드포인트

### 1. 메시지 전송

**POST** `/api/game/send-message`

플레이어가 메시지를 전송합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "playerLabel": "A",
  "content": "안녕하세요! 오늘 날씨가 정말 좋네요."
}
```

#### 응답

```json
{
  "success": true,
  "messageId": "msg-123456"
}
```

#### 검증 규칙

- 게임이 `active` 상태여야 함
- 현재 턴인 플레이어만 메시지 전송 가능
- 메시지는 1-500자 사이
- 플레이어가 활성 상태여야 함

### 2. 투표 제출

**POST** `/api/game/submit-vote`

플레이어가 투표를 제출합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "playerLabel": "A",
  "votedForPlayer": "B"
}
```

#### 응답

```json
{
  "success": true,
  "voteId": "vote-123456"
}
```

#### 검증 규칙

- 게임이 `voting` 상태여야 함
- 자신에게 투표할 수 없음
- 한 번만 투표 가능
- 투표 대상 플레이어가 활성 상태여야 함

### 3. 게임 상태 변경

**POST** `/api/game/update-status`

게임 상태를 변경합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "status": "active",
  "timeRemaining": 300,
  "turnTimeRemaining": 10,
  "currentTurn": "A"
}
```

#### 응답

```json
{
  "success": true
}
```

#### 상태 전환 규칙

- `waiting` → `active`, `finished`
- `active` → `voting`, `finished`
- `voting` → `finished`
- `finished` → (최종 상태)

### 4. 턴 변경

**POST** `/api/game/change-turn`

다음 플레이어로 턴을 변경합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "nextPlayerLabel": "B",
  "turnTimeRemaining": 10
}
```

#### 응답

```json
{
  "success": true
}
```

#### 검증 규칙

- 게임이 `active` 상태여야 함
- 다음 플레이어가 활성 상태여야 함

### 5. 게임 정보 조회

**GET** `/api/game/info?gameId=game-123456`

게임 정보를 조회합니다.

#### 응답

```json
{
  "success": true,
  "game": {
    "id": "game-123456",
    "type": "1v1",
    "status": "active",
    "topicId": 1,
    "timeRemaining": 300,
    "turnTimeRemaining": 10,
    "currentTurn": "A",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "players": [
    {
      "label": "A",
      "isAI": false,
      "status": "active"
    },
    {
      "label": "B",
      "isAI": true,
      "status": "active",
      "aiPersonaId": 1
    }
  ]
}
```

### 6. 게임 메시지 조회

**GET** `/api/game/messages?gameId=game-123456&limit=50&offset=0`

게임 메시지를 조회합니다.

#### 응답

```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-123456",
      "playerLabel": "A",
      "content": "안녕하세요!",
      "timestamp": "2024-01-15T10:30:00Z",
      "isSystemMessage": false
    }
  ]
}
```

### 7. 게임 투표 조회

**GET** `/api/game/votes?gameId=game-123456`

게임 투표를 조회합니다.

#### 응답

```json
{
  "success": true,
  "votes": [
    {
      "id": "vote-123456",
      "playerLabel": "A",
      "votedForPlayer": "B",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 8. 게임 통계 조회

**GET** `/api/game/stats?gameId=game-123456`

게임 통계를 조회합니다.

#### 응답

```json
{
  "success": true,
  "stats": {
    "totalMessages": 15,
    "totalVotes": 2,
    "averageResponseTime": 8,
    "gameDuration": 180
  }
}
```

## 클라이언트 사용법

### 기본 사용법

```typescript
import { 
  sendMessage, 
  submitVote, 
  updateGameStatus, 
  changeTurn,
  getGameInfo 
} from '@/lib/game-api-client'

// 메시지 전송
const messageResult = await sendMessage({
  gameId: 'game-123456',
  playerLabel: 'A',
  content: '안녕하세요!'
})

// 투표 제출
const voteResult = await submitVote({
  gameId: 'game-123456',
  playerLabel: 'A',
  votedForPlayer: 'B'
})

// 게임 상태 변경
const statusResult = await updateGameStatus({
  gameId: 'game-123456',
  status: 'voting',
  timeRemaining: 60
})

// 턴 변경
const turnResult = await changeTurn({
  gameId: 'game-123456',
  nextPlayerLabel: 'B',
  turnTimeRemaining: 10
})

// 게임 정보 조회
const gameInfo = await getGameInfo('game-123456')
```

### 게임 시작/종료

```typescript
import { startGame, startVoting, endGame } from '@/lib/game-api-client'

// 게임 시작
await startGame('game-123456', 'A')

// 투표 시작
await startVoting('game-123456')

// 게임 종료
await endGame('game-123456', 'all_voted')
```

### 자동 턴 변경

```typescript
import { nextTurn } from '@/lib/game-api-client'

// 다음 턴으로 자동 변경 (A -> B -> C -> D -> E -> A)
await nextTurn('game-123456', 'A')
```

### 전체 게임 데이터 조회

```typescript
import { getFullGameData } from '@/lib/game-api-client'

const gameData = await getFullGameData('game-123456')
console.log('게임 정보:', gameData.gameInfo)
console.log('플레이어:', gameData.players)
console.log('메시지:', gameData.messages)
console.log('투표:', gameData.votes)
console.log('통계:', gameData.stats)
```

## 실시간 이벤트

### 메시지 전송 시

- 메시지가 데이터베이스에 저장됨
- 실시간 브로드캐스트로 모든 플레이어에게 전송
- 턴 자동 변경 (선택사항)

### 투표 제출 시

- 투표가 데이터베이스에 저장됨
- 실시간 브로드캐스트로 투표 현황 업데이트
- 모든 플레이어가 투표하면 게임 자동 종료

### 게임 상태 변경 시

- 상태 변경에 따른 시스템 메시지 자동 추가
- 실시간 브로드캐스트로 모든 플레이어에게 알림

## 에러 처리

### 일반적인 에러 응답

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

### HTTP 상태 코드

- **200**: 성공
- **400**: 잘못된 요청 (입력 검증 실패)
- **404**: 리소스를 찾을 수 없음
- **500**: 서버 내부 오류

### 일반적인 에러 상황

1. **게임을 찾을 수 없음**: 잘못된 gameId
2. **플레이어를 찾을 수 없음**: 잘못된 playerLabel
3. **게임 상태 오류**: 현재 게임 상태에서 허용되지 않는 액션
4. **턴 오류**: 현재 턴이 아닌 플레이어의 액션
5. **중복 투표**: 이미 투표한 플레이어의 재투표

## 성능 고려사항

### 데이터베이스 최적화

- 인덱스를 통한 빠른 조회
- 배치 처리로 효율적인 업데이트
- 연결 풀링으로 리소스 관리

### 실시간 처리

- 비동기 브로드캐스트로 응답 시간 최적화
- 에러 발생 시에도 메인 로직은 계속 진행
- 실패한 브로드캐스트는 로그만 남기고 무시

### 보안

- 입력 검증으로 악의적 요청 방지
- Row Level Security (RLS)로 데이터 접근 제어
- 서비스 역할 키로 관리자 기능 실행

## 모니터링

### 로그

- 모든 API 호출 로그
- 에러 상황 상세 로그
- 성능 메트릭 수집

### 메트릭

- API 응답 시간
- 에러율
- 동시 사용자 수
- 게임 완료율
