# 매치메이킹 API 문서

## 개요

매치메이킹 API는 플레이어들이 게임에 참가할 수 있도록 대기열을 관리하고 매칭을 처리합니다.

## API 엔드포인트

### 1. 대기열 참가

**POST** `/api/matchmaking/join`

플레이어를 대기열에 추가하고 매칭을 시도합니다.

#### 요청 본문

```json
{
  "queueType": "1v1", // "1v1" 또는 "1vn"
  "playerLabel": "A", // "A", "B", "C", "D", "E" 중 하나
  "isAI": false, // 선택사항, 기본값: false
  "aiPersonaId": 1 // 선택사항, AI 플레이어인 경우
}
```

#### 응답

**즉시 매칭 성공 시:**
```json
{
  "success": true,
  "gameId": "game-123456",
  "matchResult": {
    "gameId": "game-123456",
    "gameType": "1v1",
    "players": [
      {
        "id": "player-1",
        "playerLabel": "A",
        "joinedAt": "2024-01-15T10:30:00Z",
        "isAI": false
      },
      {
        "id": "player-2",
        "playerLabel": "B",
        "joinedAt": "2024-01-15T10:30:00Z",
        "isAI": true,
        "aiPersonaId": 1
      }
    ],
    "matchedAt": "2024-01-15T10:30:00Z",
    "topicId": 1
  },
  "estimatedWaitTime": 0
}
```

**대기열에 추가됨:**
```json
{
  "success": true,
  "queueEntryId": "queue-123456",
  "estimatedWaitTime": 45
}
```

### 2. 대기열 상태 조회

**GET** `/api/matchmaking/join?queueType=1v1`

특정 대기열의 통계 정보를 조회합니다.

#### 응답

```json
{
  "success": true,
  "stats": {
    "queueType": "1v1",
    "waitingPlayers": 5,
    "averageWaitTime": 30,
    "estimatedWaitTime": 45
  }
}
```

### 3. 대기열에서 나가기

**POST** `/api/matchmaking/leave`

플레이어가 대기열에서 나갑니다.

#### 요청 본문

```json
{
  "queueType": "1v1",
  "playerId": "player-123456"
}
```

#### 응답

```json
{
  "success": true,
  "message": "대기열에서 성공적으로 제거되었습니다."
}
```

### 4. 매치메이킹 상태 확인

**GET** `/api/matchmaking/status?queueEntryId=queue-123456`

특정 플레이어의 매치메이킹 상태를 확인합니다.

#### 응답

```json
{
  "success": true,
  "status": {
    "isMatched": true,
    "gameId": "game-123456",
    "matchResult": {
      "gameId": "game-123456",
      "gameType": "1v1",
      "players": [...],
      "matchedAt": "2024-01-15T10:30:00Z",
      "topicId": 1
    }
  }
}
```

### 5. 매치메이킹 처리 (백그라운드)

**POST** `/api/matchmaking/process`

백그라운드에서 매칭 처리를 실행합니다.

#### 응답

```json
{
  "success": true,
  "message": "매치메이킹 처리가 완료되었습니다.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 클라이언트 사용법

### 기본 사용법

```typescript
import { joinQueue, pollMatchmakingStatus } from '@/lib/matchmaking-client'

// 대기열 참가
const result = await joinQueue({
  queueType: '1v1',
  playerLabel: 'A'
})

if (result.success && result.gameId) {
  // 즉시 매칭 성공
  console.log('게임 시작:', result.gameId)
} else if (result.queueEntryId) {
  // 대기열에 추가됨, 폴링 시작
  const stopPolling = pollMatchmakingStatus(
    result.queueEntryId,
    (gameId, matchResult) => {
      console.log('매칭 완료:', gameId)
      // 게임 페이지로 이동
      window.location.href = `/game/${gameId}`
    },
    (error) => {
      console.error('매칭 오류:', error)
    }
  )
}
```

### 대기열 통계 조회

```typescript
import { getQueueStats } from '@/lib/matchmaking-client'

const stats = await getQueueStats('1v1')
console.log('대기 중인 플레이어:', stats.waitingPlayers)
console.log('예상 대기 시간:', stats.estimatedWaitTime)
```

### 대기열에서 나가기

```typescript
import { leaveQueue } from '@/lib/matchmaking-client'

await leaveQueue('1v1', 'player-123456')
```

## 매칭 알고리즘

### 1:1 게임 매칭

- **최소 플레이어**: 2명
- **최대 플레이어**: 2명
- **대기 시간 제한**: 90초
- **AI 플레이어 비율**: 50%

### 1:N 게임 매칭

- **최소 플레이어**: 3명
- **최대 플레이어**: 5명
- **대기 시간 제한**: 120초
- **AI 플레이어 비율**: 60%

### 매칭 우선순위

1. **즉시 매칭**: 충분한 플레이어가 있을 때
2. **AI 보충**: 대기 시간 초과 시 AI 플레이어로 채움
3. **랜덤 AI**: 매칭 확률에 따라 AI 플레이어 추가

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

## 성능 고려사항

### 대기열 관리

- 메모리 기반 대기열 (실제 운영에서는 Redis 권장)
- 주기적인 정리 작업으로 오래된 엔트리 제거
- 인덱스를 통한 빠른 조회

### 매칭 처리

- 비동기 처리로 응답 시간 최적화
- 폴링 기반 상태 확인 (실제 운영에서는 WebSocket 권장)
- 배치 처리로 효율적인 매칭

## 모니터링

### 통계 뷰

- `queue_stats`: 실시간 대기열 통계
- `matchmaking_stats`: 24시간 매칭 성공률

### 정리 작업

- `cleanup_old_queue_entries()`: 10분 이상 된 대기열 엔트리 정리
- 주기적 실행 권장 (크론잡 등)
