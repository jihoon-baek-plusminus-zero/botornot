# 턴 관리 API 문서

## 개요

턴 관리 API는 게임 진행 중 플레이어들의 턴을 관리하고, 타이머를 처리하며, 자동 턴 전환을 담당합니다. Supabase Realtime을 통해 모든 클라이언트에게 턴 변경 이벤트를 실시간으로 방송합니다.

## 핵심 기능

### 1. 턴 자동 순환
- 플레이어 순서: A → B → C → D → E → A
- 활성 플레이어만 턴 대상으로 선택
- 비활성 플레이어 자동 스킵

### 2. 턴 타이머 관리
- 기본 턴 시간: 10초
- 경고 시간: 3초 남았을 때
- 자동 스킵: 0초가 되면 자동으로 다음 플레이어로

### 3. 실시간 이벤트
- 턴 변경 시 모든 클라이언트에게 브로드캐스트
- 타이머 업데이트 실시간 전송
- "Skipped" 메시지 자동 생성

## API 엔드포인트

### 1. 턴 관리 API

**POST** `/api/game/turn-management`

턴 관리 기능을 처리합니다.

#### 요청 본문

```json
{
  "action": "initialize|change_turn|message_sent",
  "gameId": "game-123456",
  "firstPlayer": "A", // initialize 시에만
  "nextPlayerLabel": "B", // change_turn 시에만
  "reason": "manual|timeout|message_sent|auto_skip", // change_turn 시에만
  "turnTimeRemaining": 10, // change_turn 시에만 (선택사항)
  "playerLabel": "A" // message_sent 시에만
}
```

#### 응답 예시

```json
{
  "success": true,
  "newTurn": "B",
  "turnTimeRemaining": 10
}
```

### 2. 턴 타이머 API

**POST** `/api/game/turn-timer`

턴 타이머를 업데이트합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456"
}
```

#### 응답 예시

```json
{
  "success": true,
  "message": "턴 타이머가 업데이트되었습니다.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. 턴 상태 조회

**GET** `/api/game/turn-management?gameId=game-123456&action=state`

현재 턴 상태를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "turnState": {
    "gameId": "game-123456",
    "currentTurn": "A",
    "turnTimeRemaining": 7,
    "turnStatus": "active",
    "turnStartTime": "2024-01-15T10:30:00Z",
    "lastActivityTime": "2024-01-15T10:30:00Z",
    "skippedTurns": [],
    "totalTurns": 3
  }
}
```

### 4. 턴 히스토리 조회

**GET** `/api/game/turn-management?gameId=game-123456&action=history`

턴 변경 히스토리를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "history": [
    {
      "id": "turn-123456",
      "game_id": "game-123456",
      "previous_turn": null,
      "next_turn": "A",
      "reason": "initialize",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "turn-123457",
      "game_id": "game-123456",
      "previous_turn": "A",
      "next_turn": "B",
      "reason": "message_sent",
      "timestamp": "2024-01-15T10:30:10Z"
    }
  ]
}
```

## 클라이언트 사용법

### 기본 사용법

```typescript
import { 
  initializeTurnManagement,
  changeTurn,
  handleMessageSent,
  getTurnState,
  startTurnTimerPolling
} from '@/lib/turn-management-client'

// 턴 관리 초기화
const initResult = await initializeTurnManagement('game-123', 'A')

// 턴 변경
const turnResult = await changeTurn({
  gameId: 'game-123',
  nextPlayerLabel: 'B',
  reason: 'message_sent'
})

// 메시지 전송 시 턴 자동 변경
await handleMessageSent('game-123', 'A')

// 턴 상태 조회
const turnState = await getTurnState('game-123')
```

### 턴 타이머 폴링

```typescript
// 턴 타이머 폴링 시작
const stopPolling = startTurnTimerPolling(
  'game-123',
  (timeRemaining, isWarning) => {
    console.log(`남은 시간: ${timeRemaining}초`)
    if (isWarning) {
      console.log('⚠️ 시간이 얼마 남지 않았습니다!')
    }
  },
  (error) => {
    console.error('타이머 폴링 오류:', error)
  },
  1000 // 1초마다 업데이트
)

// 폴링 중지
stopPolling()
```

### 자동 턴 변경

```typescript
import { autoChangeTurn, getNextPlayer } from '@/lib/turn-management-client'

// 메시지 전송 후 자동 턴 변경
const activePlayers: PlayerLabel[] = ['A', 'B', 'C']
const result = await autoChangeTurn('game-123', 'A', activePlayers)

// 다음 플레이어 찾기
const nextPlayer = getNextPlayer('A', activePlayers) // 'B' 반환
```

## 실시간 이벤트

### 턴 변경 이벤트

```typescript
// Supabase Realtime 구독
const channel = supabase.channel(`game:${gameId}`)
  .on('broadcast', { event: 'turn_change' }, (payload) => {
    const { currentTurn, turnTimeRemaining, previousTurn } = payload.payload
    console.log(`턴 변경: ${previousTurn} → ${currentTurn}`)
    console.log(`남은 시간: ${turnTimeRemaining}초`)
  })
```

### 타이머 업데이트 이벤트

```typescript
// 타이머 업데이트 구독
const channel = supabase.channel(`game:${gameId}`)
  .on('broadcast', { event: 'turn_timer_update' }, (payload) => {
    const { timeRemaining, isWarning } = payload.payload
    console.log(`타이머: ${timeRemaining}초`)
    if (isWarning) {
      console.log('⚠️ 경고: 시간이 얼마 남지 않았습니다!')
    }
  })
```

## 턴 관리 로직

### 1. 턴 초기화

```typescript
// 게임 시작 시 첫 번째 플레이어로 턴 초기화
await initializeTurnManagement(gameId, 'A')
```

### 2. 메시지 전송 시 자동 턴 변경

```typescript
// 메시지 전송 후 자동으로 다음 플레이어로 턴 변경
await handleMessageSent(gameId, currentPlayerLabel)
```

### 3. 타임아웃 처리

```typescript
// 턴 시간이 끝나면 자동으로 "Skipped" 메시지 생성 후 다음 플레이어로
// 이는 백그라운드에서 자동 처리됩니다
```

### 4. 턴 순환 로직

```typescript
// 플레이어 순서: A → B → C → D → E → A
// 비활성 플레이어는 자동으로 스킵
const nextPlayer = getNextPlayer('A', ['A', 'B', 'C']) // 'B' 반환
```

## 데이터베이스 스키마

### turn_logs 테이블

```sql
CREATE TABLE turn_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  previous_turn VARCHAR(1) CHECK (previous_turn IN ('A', 'B', 'C', 'D', 'E')),
  next_turn VARCHAR(1) NOT NULL CHECK (next_turn IN ('A', 'B', 'C', 'D', 'E')),
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('manual', 'timeout', 'message_sent', 'auto_skip')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### turn_stats 뷰

```sql
CREATE VIEW turn_stats AS
SELECT 
  game_id,
  COUNT(*) as total_turns,
  COUNT(CASE WHEN reason = 'timeout' THEN 1 END) as timeout_count,
  COUNT(CASE WHEN reason = 'message_sent' THEN 1 END) as message_sent_count,
  COUNT(CASE WHEN reason = 'auto_skip' THEN 1 END) as auto_skip_count,
  AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY game_id ORDER BY timestamp)))) as avg_turn_duration_seconds,
  MIN(timestamp) as first_turn_time,
  MAX(timestamp) as last_turn_time
FROM turn_logs 
GROUP BY game_id;
```

## 설정 옵션

### 턴 타이머 설정

```typescript
import { updateTurnTimerConfig } from '@/lib/turn-management'

// 타이머 설정 변경
updateTurnTimerConfig({
  defaultTurnTime: 15, // 15초
  warningTime: 5, // 5초 남았을 때 경고
  autoSkipTime: 0, // 0초가 되면 자동 스킵
  gracePeriod: 3 // 3초 여유 시간
})
```

## 에러 처리

### 일반적인 에러 상황

1. **게임을 찾을 수 없음**: 잘못된 gameId
2. **플레이어를 찾을 수 없음**: 잘못된 playerLabel
3. **게임 상태 오류**: 게임이 활성 상태가 아닌 경우
4. **턴 순서 오류**: 잘못된 턴 변경 요청

### 에러 응답 예시

```json
{
  "success": false,
  "error": "게임이 활성 상태가 아닙니다."
}
```

## 성능 고려사항

### 메모리 관리

- 턴 상태는 메모리에 저장 (실제로는 Redis 권장)
- 게임 종료 시 자동 정리
- 메모리 누수 방지를 위한 정기 정리

### 실시간 처리

- 비동기 브로드캐스트로 응답 시간 최적화
- 에러 발생 시에도 메인 로직은 계속 진행
- 실패한 브로드캐스트는 로그만 남기고 무시

### 데이터베이스 최적화

- 턴 로그 인덱스로 빠른 조회
- 배치 처리로 효율적인 업데이트
- 정기적인 오래된 로그 정리

## 모니터링

### 로그

- 모든 턴 변경 로그
- 타임아웃 발생 로그
- 실시간 이벤트 전송 로그

### 메트릭

- 평균 턴 지속 시간
- 타임아웃 발생률
- 턴 변경 성공률
- 실시간 이벤트 전송 성공률
