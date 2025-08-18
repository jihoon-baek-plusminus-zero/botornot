# BotOrNot - AI vs Human Game

AI vs Human 추리 게임 - 대화 상대가 AI인지 사람인지 맞춰보세요!

## 🎮 게임 소개

BotOrNot은 실시간 익명 채팅을 통해 상대방이 AI인지 사람인지 추리하는 게임입니다. 모든 게임 세션은 독립적이며, 게임 종료 시 모든 대화 기록과 데이터는 즉시 파기되어 개인정보 보호와 가벼운 플레이 경험을 보장합니다.

## ✨ 주요 기능

### 🎯 게임 모드
- **1:1 게임**: 1명의 사람 vs 1명의 AI
- **1:N 게임**: 3명의 사람 + 2명의 AI (총 5명)

### 🤖 AI 시스템
- **10가지 AI 페르소나**: 각각 다른 성격과 대화 스타일
- **맥락 기반 응답**: 대화 흐름을 고려한 자연스러운 응답
- **다양한 메시지 풀**: 50가지 이상의 다양한 응답

### ⏰ 게임 메커니즘
- **턴 기반 채팅**: 순서대로 메시지 전송
- **자동 턴 관리**: 10초 제한 시간
- **투표 시스템**: 게임 종료 후 상대방 정체 추리

### 🔒 개인정보 보호
- **익명 플레이**: 플레이어는 라벨(A, B, C...)로만 식별
- **데이터 파기**: 게임 종료 시 모든 데이터 즉시 삭제
- **실시간 처리**: 서버에 대화 내용 저장하지 않음

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **AI**: OpenAI GPT-4
- **Deployment**: Vercel

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/jihoon-baek-plusminus-zero/botornot.git
cd botornot
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Game Configuration
NEXT_PUBLIC_GAME_1V1_TIMER=120
NEXT_PUBLIC_GAME_1VN_TIMER=300
NEXT_PUBLIC_CHAT_TURN_TIMER=10
NEXT_PUBLIC_VOTE_TIMER=10
NEXT_PUBLIC_MAX_WAIT_TIME=90
```

### 4. Supabase 설정
```bash
# Supabase CLI 설치
npm install -g supabase

# 로컬 Supabase 시작
supabase start

# 데이터베이스 스키마 적용
supabase db reset
```

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 🎯 게임 플레이

1. **게임 시작**: 메인 화면에서 "1:1 Game Start" 또는 "1:N Game Start" 선택
2. **매치메이킹**: 다른 플레이어들과 매칭 대기
3. **대화 시작**: 주어진 주제로 턴 기반 채팅
4. **투표**: 게임 종료 후 상대방이 AI인지 사람인지 추리
5. **결과 확인**: 정답과 상대방의 추리 결과 확인

## 📁 프로젝트 구조

```
botornot/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   ├── game/           # 게임 페이지
│   │   └── layout.tsx      # 루트 레이아웃
│   ├── components/         # React 컴포넌트
│   ├── contexts/           # React Context
│   ├── lib/               # 유틸리티 함수
│   └── types/             # TypeScript 타입 정의
├── database/              # 데이터베이스 스키마
├── supabase/              # Supabase 설정
└── docs/                  # 문서
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 연락처

프로젝트 링크: [https://github.com/jihoon-baek-plusminus-zero/botornot](https://github.com/jihoon-baek-plusminus-zero/botornot)

---

**BotOrNot** - AI vs Human 추리 게임으로 재미있는 대화를 나누어보세요! 🎮✨
