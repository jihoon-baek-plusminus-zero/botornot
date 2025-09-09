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

