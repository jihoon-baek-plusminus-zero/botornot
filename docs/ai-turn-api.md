# AI 턴 처리 API 문서

## 개요

AI 턴 처리 API는 AI vs Human 게임에서 AI 플레이어의 턴을 자동으로 처리합니다. 2단계 프로세스로 구성되어 있으며, 먼저 투표 여부를 결정하고, 투표하지 않을 경우 자연스러운 채팅 메시지를 생성합니다.

## 핵심 기능

### 1. 2단계 턴 처리
- **1단계**: 대화 기록 분석을 통한 투표 결정
- **2단계**: 투표하지 않을 경우 페르소나 기반 메시지 생성

### 2. 지능형 의사결정
- 게임 진행도, 대화 품질, 시간 압박 등을 고려한 투표 결정
- 페르소나별 특성을 반영한 자연스러운 메시지 생성

### 3. 품질 관리
- 메시지 품질 평가 및 스킵 결정
- 통계 및 성능 모니터링
- 에러 처리 및 재시도 로직

## API 엔드포인트

### 1. AI 턴 처리

**POST** `/api/ai/turn`

AI 플레이어의 턴을 처리합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "playerLabel": "B",
  "personaId": 1,
  "gameType": "1v1",
  "currentTopic": "오늘 날씨가 정말 좋네요!",
  "conversationHistory": [
    {
      "playerLabel": "A",
      "content": "안녕하세요! 오늘 날씨가 정말 좋네요.",
      "timestamp": "2024-01-15T10:30:00Z",
      "isSystemMessage": false
    },
    {
      "playerLabel": "B",
      "content": "네, 정말 좋은 날씨네요! 😊",
      "timestamp": "2024-01-15T10:31:00Z",
      "isSystemMessage": false
    }
  ],
  "turnTimeRemaining": 8,
  "gameStatus": "active",
  "voteCount": 0,
  "totalPlayers": 2,
  "timeRemaining": 95,
  "currentTurn": "B",
  "players": [
    {
      "label": "A",
      "name": "Player A",
      "isAI": false,
      "isActive": true,
      "hasVoted": false
    },
    {
      "label": "B",
      "name": "AI Player",
      "isAI": true,
      "isActive": true,
      "hasVoted": false
    }
  ]
}
```

#### 응답 예시 (투표 결정)

```json
{
  "success": true,
  "turnStatus": "completed",
  "voteDecision": {
    "success": true,
    "shouldVote": true,
    "reason": "충분한 정보가 있어 투표합니다.",
    "confidence": 0.85,
    "analysis": {
      "gameProgress": 0.7,
      "conversationQuality": 0.8,
      "timePressure": 0.6,
      "playerBehavior": "balanced"
    }
  },
  "actions": [
    {
      "type": "vote",
      "data": {
        "reason": "충분한 정보가 있어 투표합니다.",
        "confidence": 0.85
      },
      "timestamp": "2024-01-15T10:32:00Z"
    }
  ],
  "metadata": {
    "totalProcessingTime": 1250,
    "personaId": 1,
    "playerLabel": "B",
    "gameId": "game-123456"
  }
}
```

#### 응답 예시 (메시지 생성)

```json
{
  "success": true,
  "turnStatus": "completed",
  "voteDecision": {
    "success": true,
    "shouldVote": false,
    "reason": "더 많은 정보가 필요합니다.",
    "confidence": 0.7,
    "analysis": {
      "gameProgress": 0.4,
      "conversationQuality": 0.6,
      "timePressure": 0.3,
      "playerBehavior": "balanced"
    }
  },
  "messageGeneration": {
    "success": true,
    "message": "맞아요! 이런 날에는 밖에 나가서 산책하기 좋을 것 같아요 😊",
    "metadata": {
      "responseTime": 1200,
      "tokenUsage": 45,
      "quality": 0.85
    }
  },
  "actions": [
    {
      "type": "message",
      "data": {
        "message": "맞아요! 이런 날에는 밖에 나가서 산책하기 좋을 것 같아요 😊"
      },
      "timestamp": "2024-01-15T10:32:00Z"
    }
  ],
  "metadata": {
    "totalProcessingTime": 1250,
    "personaId": 1,
    "playerLabel": "B",
    "gameId": "game-123456"
  }
}
```

### 2. AI 턴 통계 조회

**GET** `/api/ai/turn?action=stats`

AI 턴 처리 통계를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "stats": {
    "totalTurns": 150,
    "successfulTurns": 145,
    "failedTurns": 5,
    "averageProcessingTime": 1250,
    "voteDecisions": {
      "total": 150,
      "voted": 45,
      "skipped": 105
    },
    "messageGenerations": {
      "total": 105,
      "generated": 95,
      "skipped": 10
    },
    "personaUsage": {
      "1": 80,
      "2": 70
    },
    "errorRates": {
      "OpenAIError": 3,
      "NetworkError": 2
    },
    "qualityMetrics": {
      "averageVoteConfidence": 0.78,
      "averageMessageQuality": 0.82,
      "averageResponseTime": 1250
    }
  }
}
```

### 3. AI 턴 로그 조회

**GET** `/api/ai/turn?action=logs&limit=50&offset=0&gameId=game-123`

AI 턴 처리 로그를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "logs": [
    {
      "id": "turn-123456",
      "gameId": "game-123",
      "playerLabel": "B",
      "personaId": 1,
      "turnStatus": "completed",
      "processingTime": 1250,
      "voteDecision": {
        "success": true,
        "shouldVote": false,
        "reason": "더 많은 정보가 필요합니다.",
        "confidence": 0.7
      },
      "messageGeneration": {
        "success": true,
        "message": "맞아요! 이런 날에는 밖에 나가서 산책하기 좋을 것 같아요 😊",
        "metadata": {
          "responseTime": 1200,
          "tokenUsage": 45,
          "quality": 0.85
        }
      },
      "timestamp": "2024-01-15T10:32:00Z",
      "metadata": {
        "config": {
          "minConversationLength": 3,
          "maxWaitTime": 8000,
          "voteThreshold": 0.7,
          "skipThreshold": 0.3,
          "responseTimeLimit": 5000,
          "qualityThreshold": 0.6
        },
        "context": {
          "gameType": "1v1",
          "gameStatus": "active",
          "conversationLength": 5,
          "timeRemaining": 95
        }
      }
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### 4. AI 턴 통계 리셋

**GET** `/api/ai/turn?action=reset`

AI 턴 처리 통계를 리셋합니다.

### 5. AI 턴 로그 정리

**GET** `/api/ai/turn?action=clear-logs`

AI 턴 처리 로그를 정리합니다.

## 클라이언트 사용법

### 기본 사용법

```typescript
import { 
  handleAITurn,
  getAITurnStats,
  getAITurnLogs,
  handleSimpleAITurn
} from '@/lib/ai-turn-client'

// AI 턴 처리
const result = await handleAITurn({
  gameId: 'game-123',
  playerLabel: 'B',
  personaId: 1,
  gameType: '1v1',
  currentTopic: '오늘 날씨',
  conversationHistory: [
    {
      playerLabel: 'A',
      content: '안녕하세요!',
      timestamp: '2024-01-15T10:30:00Z',
      isSystemMessage: false
    }
  ],
  turnTimeRemaining: 8,
  gameStatus: 'active',
  voteCount: 0,
  totalPlayers: 2,
  timeRemaining: 95,
  currentTurn: 'B',
  players: [
    {
      label: 'A',
      name: 'Player A',
      isAI: false,
      isActive: true,
      hasVoted: false
    },
    {
      label: 'B',
      name: 'AI Player',
      isAI: true,
      isActive: true,
      hasVoted: false
    }
  ]
})

// 결과 처리
if (result.success) {
  if (result.voteDecision?.shouldVote) {
    console.log('AI가 투표를 결정했습니다:', result.voteDecision.reason)
    // 투표 처리 로직
  } else if (result.messageGeneration?.message) {
    console.log('AI가 메시지를 생성했습니다:', result.messageGeneration.message)
    // 메시지 전송 로직
  }
}

// 통계 조회
const stats = await getAITurnStats()

// 로그 조회
const logs = await getAITurnLogs({ limit: 50, gameId: 'game-123' })
```

### 간단한 사용법

```typescript
import { handleSimpleAITurn } from '@/lib/ai-turn-client'

// 간단한 AI 턴 처리
const result = await handleSimpleAITurn(
  'game-123',
  'B',
  1,
  '1v1',
  '오늘 날씨',
  conversationHistory,
  8,
  'active',
  0,
  2,
  95,
  'B',
  players
)
```

### 재시도 로직

```typescript
import { handleAITurnWithRetry } from '@/lib/ai-turn-client'

// 재시도 로직이 포함된 AI 턴 처리
const result = await handleAITurnWithRetry(
  request,
  3, // 최대 3번 재시도
  1000 // 1초 간격
)
```

### 성능 분석

```typescript
import { analyzeAITurnPerformance } from '@/lib/ai-turn-client'

// AI 턴 성능 분석
const performance = await analyzeAITurnPerformance('game-123')

console.log('평균 처리 시간:', performance.averageProcessingTime)
console.log('성공률:', performance.successRate)
console.log('투표율:', performance.voteRate)
console.log('메시지 생성율:', performance.messageRate)
```

### 최적화 제안

```typescript
import { getAITurnOptimizationSuggestions } from '@/lib/ai-turn-client'

// AI 턴 최적화 제안
const suggestions = await getAITurnOptimizationSuggestions()

suggestions.forEach(suggestion => {
  console.log(`우선순위: ${suggestion.priority}`)
  console.log(`영향도: ${suggestion.impact}`)
  suggestion.suggestions.forEach(s => console.log(`- ${s}`))
})
```

## 투표 결정 로직

### 1. 투표 결정 요인

#### 시간 압박
- 게임 종료 시간이 가까워지면 투표 확률 증가
- 2분 기준으로 시간 압박 계산

#### 대화 품질
- 대화 길이, 메시지 다양성, 참여도 고려
- 최소 3개 메시지 이상에서 투표 가능

#### 게임 진행도
- 투표한 플레이어 수, 전체 플레이어 수 비율
- 대화 길이와 시간 진행도 종합 평가

#### 플레이어 행동
- 인간/AI 플레이어 비율 분석
- 최근 메시지 패턴 분석

### 2. 투표 결정 임계값

```typescript
const DEFAULT_TURN_CONFIG = {
  voteThreshold: 0.7, // 70% 이상 확신할 때 투표
  skipThreshold: 0.3, // 30% 이하 확신할 때 스킵
  minConversationLength: 3, // 최소 3개 메시지
  maxWaitTime: 8000, // 최대 8초 대기
  responseTimeLimit: 5000, // 5초 응답 제한
  qualityThreshold: 0.6 // 60% 이상 품질
}
```

## 메시지 생성 로직

### 1. 메시지 생성 조건

#### 투표하지 않을 경우
- 투표 결정에서 `shouldVote: false`인 경우
- 확신도가 스킵 임계값보다 높은 경우

#### 품질 기준
- 메시지 품질이 60% 이상인 경우
- 페르소나 일관성, 자연스러움, 길이 적절성 평가

### 2. 메시지 품질 평가

#### 페르소나 일관성
- 캐주얼 페르소나: 이모지, 오타 허용
- 정중한 페르소나: 정확한 맞춤법, 최소 이모지

#### 자연스러움
- 적절한 문장 종결
- 과도한 반복 없음
- 적절한 길이 (5-200자)

#### 길이 적절성
- 페르소나별 평균 길이 대비 적절성
- 너무 짧거나 긴 메시지 방지

## 에러 처리

### 일반적인 에러 상황

1. **AI 페르소나 오류**: 존재하지 않는 페르소나 ID
2. **OpenAI API 오류**: API 키 문제, 할당량 초과
3. **네트워크 오류**: 연결 실패, 타임아웃
4. **입력 검증 오류**: 잘못된 파라미터
5. **게임 상태 오류**: 게임이 종료된 상태

### 에러 응답 예시

```json
{
  "success": false,
  "turnStatus": "error",
  "actions": [],
  "metadata": {
    "totalProcessingTime": 500,
    "personaId": 1,
    "playerLabel": "B",
    "gameId": "game-123"
  },
  "error": "AI 페르소나를 찾을 수 없습니다: 999"
}
```

## 성능 최적화

### 1. 처리 시간 최적화
- AI API 응답 시간 모니터링
- 캐시 시스템 활용
- 병렬 처리 가능한 경우 활용

### 2. 품질 최적화
- 메시지 품질 임계값 조정
- 페르소나별 설정 최적화
- 투표 결정 로직 개선

### 3. 안정성 최적화
- 재시도 로직 강화
- 에러 처리 개선
- 로그 및 모니터링 강화

## 모니터링

### 1. 성능 메트릭
- 평균 처리 시간
- 성공률 및 에러율
- 투표율 및 메시지 생성율
- 페르소나별 성능

### 2. 품질 메트릭
- 평균 투표 확신도
- 평균 메시지 품질
- 페르소나 일관성 점수

### 3. 사용량 통계
- 페르소나별 사용량
- 게임 타입별 사용량
- 시간대별 사용량

## 보안 고려사항

### 1. 입력 검증
- 모든 입력 파라미터 검증
- SQL 인젝션 방지
- XSS 공격 방지

### 2. 비용 제어
- AI API 호출 제한
- 비용 모니터링
- 알림 설정

### 3. 데이터 보호
- 민감한 게임 정보 보호
- 로그 데이터 암호화
- 접근 권한 제어

## 개발 환경 설정

### 1. 환경 변수
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. 의존성 설치
```bash
npm install openai
```

### 3. 테스트
```typescript
// 테스트용 시뮬레이션
const testResult = await simulateAITurn(
  'game-123',
  'B',
  1,
  3000 // 3초 지연
)
```
