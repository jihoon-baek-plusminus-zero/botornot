# OpenAI API 서비스 모듈 문서

## 개요

OpenAI API 서비스 모듈은 AI vs Human 게임에서 AI 플레이어의 응답을 생성하고 관리합니다. GPT-4 모델을 사용하여 자연스럽고 인간다운 응답을 생성하며, 페르소나별 특성을 반영한 후처리를 수행합니다.

## 핵심 기능

### 1. AI 응답 생성
- GPT-4 모델을 사용한 자연스러운 응답 생성
- 페르소나별 특성 반영
- 대화 컨텍스트 기반 응답

### 2. 응답 후처리
- 오타 추가 (자연스러운 인간다운 특성)
- 이모지 추가 (감정 표현)
- 밈 추가 (인터넷 문화 반영)

### 3. 품질 관리
- 응답 품질 메트릭 계산
- 캐시 시스템으로 성능 최적화
- 통계 및 모니터링

## API 엔드포인트

### 1. AI 응답 생성

**POST** `/api/ai/generate-response`

AI 플레이어의 응답을 생성합니다.

#### 요청 본문

```json
{
  "gameId": "game-123456",
  "playerLabel": "B",
  "personaId": 1,
  "conversationHistory": [
    {
      "playerLabel": "A",
      "content": "안녕하세요! 오늘 날씨가 정말 좋네요.",
      "timestamp": "2024-01-15T10:30:00Z",
      "isSystemMessage": false
    }
  ],
  "currentTopic": "오늘 날씨가 정말 좋네요!",
  "gameType": "1v1",
  "turnTimeRemaining": 10,
  "maxLength": 100,
  "temperature": 0.7
}
```

#### 응답 예시

```json
{
  "success": true,
  "response": "안녕하세요! 오늘 날씨가 정말 좋네요 😊",
  "processedResponse": "안녕하세요! 오늘 날씨가 정말 좋네요 😊",
  "metadata": {
    "originalLength": 15,
    "processedLength": 17,
    "hasTypo": false,
    "hasEmoji": true,
    "hasMeme": false,
    "responseTime": 1250,
    "tokenUsage": {
      "prompt": 150,
      "completion": 25,
      "total": 175
    }
  }
}
```

### 2. AI 페르소나 조회

**GET** `/api/ai/personas`

모든 AI 페르소나 목록을 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "personas": [
    {
      "id": 1,
      "name": "캐주얼한 대학생",
      "description": "친근하고 편안한 대화를 선호하는 대학생 페르소나",
      "personality": "친근하고 편안한 대화를 선호하는 대학생 페르소나",
      "speaking_style": "casual",
      "interests": ["일반적인 관심사"],
      "background": "친근하고 편안한 대화를 선호하는 대학생 페르소나",
      "typo_chance": 0.15,
      "meme_chance": 0.25,
      "avg_response_time_ms": 3000,
      "avg_response_length": 50,
      "emoji_usage": 0.25,
      "formality_level": "casual"
    }
  ],
  "count": 2
}
```

**GET** `/api/ai/personas?id=1`

특정 AI 페르소나를 조회합니다.

### 3. AI 통계 조회

**GET** `/api/ai/generate-response?action=stats`

AI 응답 생성 통계를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "stats": {
    "totalRequests": 150,
    "successfulRequests": 145,
    "failedRequests": 5,
    "averageResponseTime": 1250,
    "averageTokenUsage": 175,
    "personaUsage": {
      "1": 80,
      "2": 65
    },
    "errorRates": {
      "OpenAIError": 3,
      "NetworkError": 2
    },
    "qualityMetrics": {
      "averageRelevance": 0.85,
      "averageNaturalness": 0.92,
      "averagePersonalityConsistency": 0.88
    }
  }
}
```

### 4. AI 캐시 통계

**GET** `/api/ai/generate-response?action=cache`

AI 응답 캐시 통계를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "cache": {
    "size": 25,
    "entries": [
      {
        "key": "game-123-B-1-weather-2",
        "usage_count": 3,
        "expiresAt": "2024-01-15T10:35:00Z"
      }
    ]
  }
}
```

## 클라이언트 사용법

### 기본 사용법

```typescript
import { 
  generateAIResponse,
  getAIPersonas,
  generateSimpleAIResponse,
  evaluateAIResponseQuality
} from '@/lib/ai-client'

// AI 응답 생성
const result = await generateAIResponse({
  gameId: 'game-123',
  playerLabel: 'B',
  personaId: 1,
  conversationHistory: [
    {
      playerLabel: 'A',
      content: '안녕하세요!',
      timestamp: '2024-01-15T10:30:00Z',
      isSystemMessage: false
    }
  ],
  currentTopic: '인사',
  gameType: '1v1',
  turnTimeRemaining: 10
})

// AI 페르소나 조회
const personas = await getAIPersonas()

// 간단한 AI 응답 생성
const simpleResult = await generateSimpleAIResponse(
  'game-123',
  'B',
  1,
  conversationHistory,
  '오늘 날씨',
  '1v1'
)
```

### 고급 사용법

```typescript
import { generateAdvancedAIResponse } from '@/lib/ai-client'

// 고급 설정으로 AI 응답 생성
const advancedResult = await generateAdvancedAIResponse(
  'game-123',
  'B',
  1,
  conversationHistory,
  '오늘 날씨',
  '1v1',
  {
    maxLength: 150,
    temperature: 0.8,
    turnTimeRemaining: 15
  }
)
```

### 품질 평가

```typescript
import { evaluateAIResponseQuality } from '@/lib/ai-client'

// AI 응답 품질 평가
const quality = evaluateAIResponseQuality(
  '안녕하세요! 오늘 날씨가 정말 좋네요 😊',
  '오늘 날씨',
  persona
)

console.log('관련성:', quality.relevance) // 0.85
console.log('자연스러움:', quality.naturalness) // 0.92
console.log('페르소나 일관성:', quality.personalityConsistency) // 0.88
console.log('전체 점수:', quality.overall) // 0.87
```

### 재시도 로직

```typescript
import { generateAIResponseWithRetry } from '@/lib/ai-client'

// 재시도 로직이 포함된 AI 응답 생성
const result = await generateAIResponseWithRetry(
  request,
  3, // 최대 3번 재시도
  1000 // 1초 간격
)
```

## AI 페르소나

### 1. 캐주얼한 대학생 (ID: 1)
- **특성**: 친근하고 편안한 대화
- **오타 확률**: 15%
- **이모지 사용**: 25%
- **밈 사용**: 25%
- **응답 시간**: 평균 3초
- **응답 길이**: 평균 50자

### 2. 신중한 직장인 (ID: 2)
- **특성**: 조심스럽고 신중한 응답
- **오타 확률**: 5%
- **이모지 사용**: 10%
- **밈 사용**: 10%
- **응답 시간**: 평균 5초
- **응답 길이**: 평균 80자

## 응답 후처리

### 1. 오타 추가
```typescript
// 일반적인 오타 패턴
const commonTypos = {
  'ㅏ': 'ㅑ', 'ㅓ': 'ㅕ', 'ㅗ': 'ㅛ', 'ㅜ': 'ㅠ',
  '가': '까', '나': '다', '라': '마', '바': '사',
  'the': 'teh', 'and': 'adn', 'you': 'yuo', 'are': 'aer'
}
```

### 2. 이모지 추가
```typescript
// 캐주얼 이모지
const casualEmojis = ['😊', '👍', '😂', '🤔', '😅', '👋', '🎉', '💪']

// 정중한 이모지
const formalEmojis = ['🙂', '👍', '🤝', '💼', '📝', '✅', '📊', '🎯']
```

### 3. 밈 추가
```typescript
// 한국어 밈
const memePhrases = ['ㅋㅋㅋ', 'ㅎㅎ', '헐', '대박', '와우', '굿', '오케이', '좋아요']
```

## 품질 메트릭

### 1. 관련성 (Relevance)
- 주제와의 연관성
- 대화 맥락과의 일치도
- 계산 방법: 공통 단어 수 / 주제 단어 수

### 2. 자연스러움 (Naturalness)
- 문장 구조의 자연스러움
- 적절한 문장 종결
- 과도한 반복 없음

### 3. 페르소나 일관성 (Personality Consistency)
- 페르소나 특성과의 일치도
- 오타, 이모지, 밈 사용 적절성
- 톤과 스타일의 일관성

### 4. 길이 적절성 (Length Appropriateness)
- 페르소나별 평균 길이 대비 적절성
- 너무 짧거나 긴 응답 방지

## 캐시 시스템

### 캐시 키 생성
```typescript
// 캐시 키: gameId-playerLabel-personaId-topic-historyLength
const cacheKey = `${gameId}-${playerLabel}-${personaId}-${topic}-${historyLength}`
```

### 캐시 설정
- **유효 기간**: 5분
- **저장 방식**: 메모리 기반 (실제로는 Redis 권장)
- **키 구조**: Base64 인코딩된 고유 키

## 성능 최적화

### 1. 토큰 사용량 최적화
- 프롬프트 길이 제한
- 불필요한 컨텍스트 제거
- 효율적인 프롬프트 구조

### 2. 응답 시간 최적화
- 캐시 시스템 활용
- 병렬 처리 가능한 경우 활용
- 재시도 로직으로 안정성 확보

### 3. 비용 최적화
- 토큰 사용량 모니터링
- 캐시 히트율 최적화
- 불필요한 API 호출 방지

## 에러 처리

### 일반적인 에러 상황

1. **OpenAI API 오류**: API 키 문제, 할당량 초과
2. **네트워크 오류**: 연결 실패, 타임아웃
3. **입력 검증 오류**: 잘못된 파라미터
4. **페르소나 오류**: 존재하지 않는 페르소나 ID

### 에러 응답 예시

```json
{
  "success": false,
  "error": "OpenAI API 할당량이 초과되었습니다."
}
```

## 모니터링

### 1. 성능 메트릭
- 평균 응답 시간
- 토큰 사용량
- 캐시 히트율
- 에러율

### 2. 품질 메트릭
- 평균 관련성 점수
- 평균 자연스러움 점수
- 평균 페르소나 일관성 점수

### 3. 사용량 통계
- 페르소나별 사용량
- 게임 타입별 사용량
- 시간대별 사용량

## 보안 고려사항

### 1. API 키 보안
- 환경 변수로 API 키 관리
- 서버 사이드에서만 API 키 사용
- 정기적인 키 로테이션

### 2. 입력 검증
- 모든 입력 파라미터 검증
- SQL 인젝션 방지
- XSS 공격 방지

### 3. 비용 제어
- API 호출 제한
- 비용 모니터링
- 알림 설정

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
const testResult = await simulateAIResponse(
  'game-123',
  'B',
  1,
  2000 // 2초 지연
)
```
