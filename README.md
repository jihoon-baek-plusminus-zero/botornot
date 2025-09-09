# Bot or Not 웹 애플리케이션

## 📍 GitHub 저장소
**저장소 주소**: [https://github.com/jihoon-baek-plusminus-zero/botornot.git](https://github.com/jihoon-baek-plusminus-zero/botornot.git)

## ⚠️ 중요 지침 ⚠️

**절대로 readme.md의 내용을 함부로 수정하지 말 것.**
모든 개발 및 배포, 수정, 프롬프트, AI 작업에서 개발자와 AI는 readme.md를 정독하고 시작할 것. 모든 프롬프트에서 readme.md의 내용을 읽고 시작할 것.
모든 개발 기록은 readme.md의 하단 개발 로그에 기록할 것.
이 때 개발 로그 기록시 기존 readme의 다른 내용들을 건들거나 수정하지 말 것. 개발 로그는 절대 수정 불가하고 항상 하단에 추가하는 방식으로 쓸 것
개발 로그 작성시에는 이번 개발에서 무엇을 개발했는지, 무엇을 수정했는지 바뀐게 무엇인지 작성할 것. 모든 변경사항을 기록할 것
다음에 아무것도 모르는 사람이 readme.md만 보아도 이것이 무슨 프로젝트이고 어떻게 진행되었고 개발기록이 어떻게 되는구나를 다 이해할 수 있도록 상세하게 작성할 것.
절대로 기존 개발로그를 수정하면 안되고 항상 및에 새로운 개발로그를 추가하는 방식으로 할 것. 기존 개발 기록에서 수정되거나 변경된 사항, 삭제된 것이 있다면 개발로그의 하단에 이러한 사항을 기록할 것. 절대로 기존 개발로그의 내용은 수정하지 말 것.

---

## 섹션 1: 기본 개발 지침 및 전체 서비스 구상

### 프로젝트 개요
- **프로젝트명**: Bot or Not
- **목적**: AI 봇과 인간을 구분하는 웹 애플리케이션
- **배포 환경**: Vercel (GitHub 연동)
- **도메인**: Cloudflare를 통한 커스텀 도메인 연결
- **백엔드**: 로컬 개발 → 최종 배포시 Supabase 전환

### 기술 스택
- **프론트엔드**: React.js (Next.js)
- **스타일링**: Tailwind CSS (다크테마)
- **백엔드**: Node.js/Express (로컬) → Supabase (배포)
- **데이터베이스**: SQLite (로컬) → Supabase PostgreSQL (배포)
- **배포**: Vercel
- **도메인**: Cloudflare

### 디자인 가이드라인
- **테마**: 다크테마 기반
- **스타일**: 깔끔하고 과하지 않은 미니멀 디자인
- **색상 팔레트**: 
  - 배경: #0a0a0a (진한 검정)
  - 카드/컨테이너: #1a1a1a (어두운 회색)
  - 텍스트: #ffffff (흰색)
  - 액센트: #3b82f6 (파란색)
  - 보조 텍스트: #9ca3af (회색)

### 개발 단계
1. **Phase 1**: 로컬 개발 환경 구축
2. **Phase 2**: 프론트엔드 기본 구조 및 UI 구현
3. **Phase 3**: 백엔드 API 개발 (로컬)
4. **Phase 4**: 통합 테스트
5. **Phase 5**: GitHub 업로드 및 Vercel 배포
6. **Phase 6**: Supabase 마이그레이션
7. **Phase 7**: Cloudflare 도메인 연결

---

## 섹션 2: 개발 언어 지침 및 코드 변수 기록

### 코딩 컨벤션
- **언어**: JavaScript/TypeScript
- **네이밍**: camelCase (변수, 함수), PascalCase (컴포넌트)
- **파일 구조**: 기능별 폴더 구조
- **주석**: 한국어로 작성

### 주요 변수 및 함수 명명 규칙
- 컴포넌트: `BotDetection`, `UserInterface`, `ResultDisplay`
- 상태 관리: `isBot`, `userInput`, `detectionResult`
- API 엔드포인트: `/api/detect`, `/api/analyze`, `/api/result`

### 폴더 구조
```
bot-or-not/
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   ├── utils/
│   └── api/
├── public/
├── docs/
└── tests/
```

---

## 섹션 3: 개발 로그

### 2024-12-19 - 프로젝트 초기 설정
**개발 내용:**
- 프로젝트 디렉토리 생성 및 초기 구조 설정
- README.md 파일 생성 및 3단계 구조 설정
  - 섹션 1: 기본 개발 지침 및 전체 서비스 구상
  - 섹션 2: 개발 언어 지침 및 코드 변수 기록
  - 섹션 3: 개발 로그
- 프로젝트 개요 및 기술 스택 정의
- 다크테마 기반 디자인 가이드라인 설정
- 개발 단계별 로드맵 계획
- 코딩 컨벤션 및 네이밍 규칙 정의

**변경사항:**
- 새로운 프로젝트 생성
- README.md 파일 생성
- 기본 프로젝트 구조 계획 수립

**다음 단계:**
- package.json 및 기본 프로젝트 파일 생성
- Next.js 프로젝트 초기화
- 기본 폴더 구조 생성
- 다크테마 스타일 설정

### 2024-12-19 - 프로젝트 기본 파일 및 구조 생성
**개발 내용:**
- package.json 파일 생성 (Next.js 14, React 18, TypeScript, Tailwind CSS 포함)
- .gitignore 파일 생성 (Node.js, Next.js, IDE, OS 관련 파일 제외)
- next.config.js 설정 파일 생성
- tailwind.config.js 다크테마 색상 팔레트 설정
- postcss.config.js 설정 파일 생성
- tsconfig.json TypeScript 설정 및 경로 별칭 설정
- 기본 폴더 구조 생성 (src/components, src/pages, src/styles, src/utils, src/types, src/app, src/api, public, docs, tests)
- src/styles/globals.css 다크테마 기반 글로벌 스타일 생성
- src/app/layout.tsx 루트 레이아웃 컴포넌트 생성
- src/app/page.tsx 메인 페이지 컴포넌트 생성
- .eslintrc.json ESLint 설정 파일 생성
- vercel.json Vercel 배포 설정 파일 생성

**변경사항:**
- 프로젝트 기본 설정 파일들 생성
- Next.js App Router 구조 설정
- 다크테마 색상 시스템 구축
- TypeScript 경로 별칭 설정
- Vercel 배포 준비 완료

**기술 스택:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS (다크테마)
- Lucide React (아이콘)
- ESLint

**다음 단계:**
- 의존성 설치 및 개발 서버 실행 테스트
- 기본 컴포넌트 구조 설계
- 봇 감지 기능 구현 계획

### 2024-12-19 - GitHub 저장소 설정 및 업로드
**개발 내용:**
- README.md에 GitHub 저장소 주소 추가: https://github.com/jihoon-baek-plusminus-zero/botornot.git
- Git 저장소 초기화 (git init)
- GitHub 원격 저장소 연결 (git remote add origin)
- 모든 프로젝트 파일 스테이징 (git add .)
- 초기 커밋 생성: "Initial project setup: Next.js app with dark theme and basic structure"
- GitHub에 프로젝트 업로드 (git push -u origin main)

**변경사항:**
- GitHub 저장소 주소가 README.md에 기록됨
- 로컬 프로젝트가 GitHub에 성공적으로 업로드됨
- 총 13개 파일이 업로드됨 (576줄 추가)
- main 브랜치가 기본 브랜치로 설정됨

**업로드된 파일들:**
- .eslintrc.json, .gitignore, README.md
- next.config.js, package.json, postcss.config.js
- src/app/layout.tsx, src/app/page.tsx
- src/styles/globals.css, tailwind.config.js
- tsconfig.json, vercel.json, onlyforperson.md

**다음 단계:**
- Vercel을 통한 자동 배포 설정
- 의존성 설치 및 개발 서버 실행 테스트
- 봇 감지 기능 구현 시작

### 2024-12-19 - 메인 화면 UI 구현
**개발 내용:**
- MainMenu 컴포넌트 생성 (src/components/MainMenu.tsx)
- 5개 메뉴 버튼 구현:
  1. 1:1 (일대일 대화) - 👤 아이콘
  2. 1:N (일대다 대화) - 👥 아이콘  
  3. 채팅방 (일반 채팅방) - 💬 아이콘
  4. AI 채팅방 (AI와의 대화) - 🤖 아이콘
  5. 대기실 (대기 및 준비) - 🏠 아이콘
- 메인 페이지 업데이트 (src/app/page.tsx) - MainMenu 컴포넌트 사용
- 다크테마 스타일 개선 (src/styles/globals.css)
- 반응형 그리드 레이아웃 적용 (1열 → 2열 → 3열)
- 호버 효과 및 애니메이션 추가
- 의존성 설치 완료 (npm install)

**변경사항:**
- 새로운 MainMenu 컴포넌트 생성
- 메인 페이지가 5개 버튼이 있는 메뉴 화면으로 변경
- 다크테마 기반의 깔끔한 UI 디자인 적용
- 버튼 호버 시 색상 변화, 그림자 효과, 약간의 상승 효과
- 아이콘 확대 효과 및 텍스트 색상 변화
- 선택된 버튼 표시 기능 (현재는 기능 없음)
- 개발 서버 실행 (npm run dev)

**UI 특징:**
- 다크테마 색상 팔레트 사용
- 그라데이션 제목 텍스트
- 글래스 효과 하단 정보 박스
- 부드러운 애니메이션 및 전환 효과
- 모바일 친화적 반응형 디자인

**다음 단계:**
- 각 버튼별 기능 구현
- 봇 감지 알고리즘 개발
- 백엔드 API 구조 설계

### 2024-12-19 - CSS 및 설정 오류 수정
**개발 내용:**
- Tailwind CSS `dark` 클래스 오류 수정
  - globals.css에서 `@apply dark` 제거
  - layout.tsx에서 `className="dark"` 제거
  - 커스텀 다크테마 색상으로 직접 적용
- next.config.js 설정 오류 수정
  - `experimental.appDir` 제거 (Next.js 14에서 기본 지원)
  - `env.CUSTOM_KEY` 제거 (불필요한 환경변수)
- 개발 서버 재시작 및 컴파일 오류 해결

**변경사항:**
- src/styles/globals.css: `dark` 클래스 사용 제거
- src/app/layout.tsx: HTML 태그에서 `dark` 클래스 제거
- next.config.js: 불필요한 설정 제거
- 개발 서버 정상 실행 확인

**해결된 오류:**
- "The `dark` class does not exist" 오류 해결
- "Invalid next.config.js options detected" 경고 해결
- 컴파일 오류 완전 해결

**다음 단계:**
- 메인 화면 UI 테스트 및 최적화
- 각 버튼별 기능 구현 시작
- 봇 감지 알고리즘 개발

### 2024-12-19 - 메인 화면 애니메이션 및 선택 기능 제거
**개발 내용:**
- 버튼 순차 애니메이션 제거 (animate-slide-up, animationDelay 제거)
- 헤더 애니메이션 제거 (animate-fade-in, animate-slide-up, animate-pulse-slow 제거)
- '선택됨' 표시 기능 완전 제거
- 불필요한 상태 관리 코드 정리 (useState, selectedButton 제거)
- 버튼 클릭 시 콘솔 로그만 출력하도록 단순화

**변경사항:**
- src/components/MainMenu.tsx: 모든 애니메이션 클래스 제거
- 선택된 버튼 표시 UI 완전 제거
- useState 훅 및 관련 상태 관리 코드 제거
- 버튼들이 즉시 표시되도록 변경
- 깔끔하고 정적인 UI로 변경

**개선된 사용자 경험:**
- 페이지 로드 시 즉시 모든 버튼 표시
- 불필요한 애니메이션으로 인한 지연 없음
- 각 버튼은 향후 특정 페이지로 이동하는 기능을 위한 준비 완료
- 단순하고 직관적인 인터페이스

**다음 단계:**
- 각 버튼별 페이지 라우팅 구현
- 봇 감지 기능 개발
- 백엔드 API 구조 설계

### 2024-12-19 - 기본 채팅방 UI 구현
**개발 내용:**
- 채팅방 페이지 생성 (src/app/chatroom/page.tsx)
- 상단바 구현:
  - 좌측: 나가기 버튼 (← 나가기)
  - 중앙: 제목 (한국어 "제목")
- 중앙 대화창 구현:
  - 좌측: 상대방 채팅 (프로필 아이콘 "?", "Player" 타이틀)
  - 우측: 내 채팅 (프로필 없음)
- 하단바 구현:
  - 실시간 채팅 입력창
  - 우측 끝: 보내기 버튼 (엔터 로고 "↵")
- 메인 메뉴에서 채팅방 버튼 클릭 시 라우팅 기능 추가

**변경사항:**
- src/app/chatroom/page.tsx: 새로운 채팅방 페이지 생성
- src/components/MainMenu.tsx: useRouter 추가 및 채팅방 라우팅 구현
- 다크테마 기반 채팅방 UI 완성
- 기본 메시지 샘플 데이터 포함

**UI 특징:**
- 요청사항에 정확히 맞춘 최소한의 UI
- 상대방 메시지: 좌측 정렬, 프로필 아이콘과 "Player" 타이틀
- 내 메시지: 우측 정렬, 프로필 없음
- 다크테마 색상 팔레트 적용
- 반응형 디자인

**다음 단계:**
- 상대방 타입 변수 추가 (AI vs 사람)
- 실시간 채팅 기능 구현
- 백엔드 워크플로우 분기 로직 개발

### 2024-12-19 - 백엔드 워크플로우 시스템 구현
**개발 내용:**
- 타입 정의 시스템 구축 (src/types/chat.ts):
  - PlayerType: 'human' | 'ai'
  - Player, ChatMessage, ChatRoom, ChatRoomState 인터페이스
- 채팅방 관리자 클래스 구현 (src/utils/chatRoomManager.ts):
  - 플레이어 관리 시스템 (total_player, player[0-4])
  - 프로필 이름 랜덤 할당 (Player A, B, C, D, E)
  - 차례제 대화 시스템 (A → B → C → D → E 순서)
  - AI용 대화 내역 포맷 생성
- AI 서비스 구현 (src/utils/aiService.ts):
  - OpenAI API 호출 기능
  - 개발용 모의 응답 시스템
  - AI 컨텍스트 포맷 처리
- API 엔드포인트 구현:
  - POST /api/chatroom/create: 채팅방 생성
  - GET /api/chatroom/[roomId]: 채팅방 상태 조회
  - POST /api/chatroom/[roomId]: 메시지 전송 및 AI 응답 처리

**백엔드 워크플로우:**
1. **채팅방 생성**: total_player와 playerTypes 배열로 채팅방 초기화
2. **프로필 할당**: Player A-E 중에서 랜덤으로 프로필 이름 배정
3. **차례제 시스템**: Player A부터 시작하여 순서대로 대화
4. **사람 플레이어**: 입력창 활성화 → 메시지 전송 → 서버 처리
5. **AI 플레이어**: 자동으로 AI API 호출 → 컨텍스트 전달 → 응답 생성
6. **자동 차례 이동**: 메시지 전송 후 자동으로 다음 플레이어 차례로 이동

**핵심 기능:**
- 혼합 플레이어 구성 지원 (사람 3명 + AI 3명)
- 각 AI의 독립적 인격체 대화
- 실시간 차례제 관리
- AI 컨텍스트 기반 응답 생성
- 메모리 기반 채팅방 저장소 (개발용)

**다음 단계:**
- 프론트엔드와 백엔드 연동
- 실시간 채팅 UI 업데이트
- 채팅방 생성 및 입장 기능 구현

### 2024-12-19 - AI 채팅방 워크플로우 구현 완료
**개발 내용:**
- OpenAI API 키 설정 및 GPT-4o-mini 모델 적용:
  - 환경변수 기반 API 키 관리 (보안 강화)
  - 모델: gpt-4o-mini
- AI 채팅방 버튼 워크플로우 구현:
  - AI 채팅방 버튼 클릭 시 자동으로 채팅방 생성
  - 플레이어 구성: 사람(나) + AI(상대방)
  - 채팅방 ID와 플레이어 ID를 URL 파라미터로 전달
- 채팅방 페이지 완전 리뉴얼:
  - URL 파라미터 기반 채팅방 상태 관리
  - 실시간 메시지 전송 및 수신
  - 차례제 시스템 UI 반영
  - AI 응답 자동 처리

**구현된 기능:**
- **AI 채팅방 생성**: 메인 메뉴에서 "AI 채팅방" 버튼 클릭 시 자동 생성
- **실시간 채팅**: 메시지 전송 후 즉시 AI 응답 생성
- **차례제 시스템**: 현재 차례인 플레이어만 입력 가능
- **상태 관리**: 채팅방 상태 실시간 업데이트
- **UI 피드백**: 로딩 상태, 차례 표시, 입력창 활성화/비활성화

**워크플로우:**
1. 메인 메뉴에서 "AI 채팅방" 버튼 클릭
2. 백엔드에서 사람+AI 구성의 채팅방 자동 생성
3. 채팅방 페이지로 이동 (roomId, playerId 파라미터 포함)
4. Player A(사람)가 첫 메시지 입력
5. 메시지 전송 후 자동으로 Player B(AI) 차례로 이동
6. AI가 GPT-4o-mini로 응답 생성 후 채팅방에 표시
7. 다시 Player A 차례로 돌아와서 대화 계속

**다음 단계:**
- 다른 채팅방 타입 구현 (1:1, 1:N, 대기실)
- 실시간 업데이트 최적화
- 채팅방 목록 및 관리 기능

