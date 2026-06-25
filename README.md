# Tomato - 개인화 집중 리추얼 웹앱

Tomato는 하루의 집중을 **계획하고, 실행하고, 기록으로 남기는 개인용 집중 관리 서비스**입니다. 단순한 포모도로 타이머가 아니라, 사용자가 오늘 집중할 일을 정하고, 실제 집중 시간을 측정하고, 완료 기록을 아카이브에서 돌아볼 수 있도록 만든 웹앱입니다.

현재 구현은 **Vanilla JavaScript + Vite + Supabase + Three.js + Document Picture-in-Picture** 기반입니다. 프론트엔드는 GitHub Pages에 정적 배포되고, 계정/데이터 동기화는 Supabase를 사용합니다.

```text
로그인
→ 오늘 집중 작업 만들기
→ 집중 시작
→ 일시정지 / 재개 / 완료
→ 휴식
→ 기록 저장
→ 아카이브에서 회고
```

Live: https://deephoon.github.io/Tomato/

---

## 제품 개요

Tomato는 이런 사용자를 위한 제품입니다.

- 오늘 할 일을 집중 블록 단위로 나누고 싶은 사람
- 단순 체크리스트보다 "실제로 몇 분 집중했는지"를 보고 싶은 사람
- 집중 중에는 전체 앱보다 작은 플로팅 타이머만 보고 싶은 사람
- 하루가 끝난 뒤 완료 기록과 흐름을 다시 보고 싶은 사람

핵심 가치는 세 가지입니다.

- **계획**: 오늘 집중할 작업을 만들고 시간 슬롯에 배치합니다.
- **실행**: 집중 타이머를 시작하고, 일시정지/재개/완료를 기록합니다.
- **회고**: 실제 집중 시간과 완료 기록을 아카이브에서 확인합니다.

제품 톤은 일반 생산성 SaaS보다 조금 더 의식적인 느낌을 갖습니다. 다만 최근 UI 정리에서 사용자가 헷갈릴 수 있는 AI/폐기 계열 표현은 줄이고, `작업 나누기`, `삭제`처럼 바로 이해되는 단어를 사용합니다.

---

## 사용 흐름

### 1. 로그인

사용자는 이메일과 비밀번호로 로그인합니다. Supabase 이메일 확인을 기반으로 계정 소유를 확인합니다.

현재 인증 정책:

- 이메일 형식과 비밀번호 규칙을 앱에서 먼저 검증합니다.
- Supabase의 Confirm email 설정이 꺼져 있으면 앱이 로그인/회원가입을 차단합니다.
- 회원가입 직후 자동 로그인하지 않고, 이메일 확인 안내를 표시합니다.
- 확인되지 않은 이메일 세션은 즉시 로그아웃 처리됩니다.

### 2. 오늘의 집중 작업 만들기

Home 또는 Planner에서 오늘 집중할 작업을 생성합니다.

작업에 저장되는 주요 정보:

- 제목
- 집중 시간
- 휴식 시간
- 날짜
- 상태
- 순서

작업 제목을 기준으로 로컬 휴리스틱 `작업 나누기`를 실행할 수 있습니다. 이 기능은 현재 실제 LLM이 아니라, 제목과 총 시간을 기반으로 여러 집중 블록을 제안하는 결정론적 로직입니다.

### 3. 집중 실행

Focus 화면에서 타이머를 시작합니다.

지원 동작:

- 시작
- 일시정지
- 재개
- 수동 완료
- 자동 완료
- 새로고침/재접속 후 세션 복원

타이머는 `Date.now()` 기반으로 남은 시간을 계산합니다. 표시 초가 바뀔 때만 화면 업데이트를 보내도록 하여 불필요한 렌더링을 줄였습니다.

일시정지 상태에서는 시각 효과도 같이 멈춥니다. 타이머는 멈췄는데 배경 도형이 계속 움직이는 혼동을 줄이기 위한 처리입니다.

### 4. 휴식과 다음 작업

집중이 끝나면 휴식으로 넘어갑니다. 휴식이 끝나거나 사용자가 휴식을 건너뛰면 대기 상태로 돌아가고, 오늘 남아 있는 다음 작업을 이어서 시작할 수 있습니다.

### 5. 플로팅 위젯

지원 브라우저에서는 Document Picture-in-Picture API로 작은 플로팅 타이머를 열 수 있습니다.

위젯에서 제공하는 것:

- 현재 모드 표시
- 남은 시간 표시
- 원형 진행 링
- 일시정지/재개
- 완료
- 메인 화면과 상태 동기화

주의:

- Document Picture-in-Picture는 모든 브라우저에서 지원되지 않습니다.
- Chrome/Edge 계열에서 가장 안정적으로 동작합니다.
- 브라우저 API 특성상 사용자의 클릭 같은 제스처가 있어야 위젯 창을 열 수 있습니다.

### 6. 아카이브 회고

완료된 집중 기록은 Archive에 쌓입니다.

아카이브에서 볼 수 있는 것:

- 날짜별 완료 기록
- 실제 집중 시간
- 계획 시간
- 완료 유형
- 회고 메모
- 제목/메모 검색
- 최신순/오래된순/집중시간순 정렬
- 이번 주/평균/최장 세션/가장 안정적인 세션 요약

공개 UI에서 JSON 복구 파일 다운로드/업로드 버튼은 제거했습니다. 내부 복원 유틸은 남아 있지만, 사용자가 파일 내용을 보고 "코드가 나왔다"고 느낄 수 있어 일반 화면에는 노출하지 않습니다.

---

## 현재 구현된 주요 기능

### 인증

- Supabase Auth 이메일 로그인
- 이메일 확인 강제
- 회원가입 후 확인 메일 안내
- 미확인 이메일 세션 차단
- 사용자 프로필 upsert
- Supabase 설정 누락 시 인증 기능 차단

### 작업 관리

- 오늘 작업 생성
- 작업 수정
- 작업 삭제
- 작업 상태 관리
- 날짜별 작업 조회
- 작업 순서 저장
- Supabase UUID 기반 작업 ID 정규화
- 원격 중복 작업 dedupe
- 삭제된 작업의 원격 row 정리

### 타이머

- 집중 시작
- 일시정지/재개
- 수동 완료
- 자동 완료
- 휴식 시작
- 휴식 건너뛰기
- 실제 경과 시간 기록
- 계획 시간과 실제 시간 분리
- `completionKey` 기반 중복 기록 방지
- 새로고침/재접속 세션 복원

### 아카이브

- 완료 기록 누적
- 실제 집중 시간 기반 통계
- 날짜별 그룹
- 검색
- 필터
- 정렬
- 상세 시트
- 회고 메모 저장

### 동기화

- Supabase 테이블 영속화
- Supabase Realtime 구독
- polling fallback
- BroadcastChannel 기반 같은 브라우저 탭/창 동기화
- 오프라인 명령 큐 기반 재시도 구조
- 실패한 원격 저장을 localStorage에 pending write로 보관
- `OFFLINE`, `SYNCING`, `SAVE FAILED` 동기화 상태 표시
- 저장 실패 상태에서 클릭으로 pending write 재시도

### UI/UX

- Home / Planner / Focus / Break / Archive 탭 구조
- 픽셀 폰트 기반 미디어아트 스타일
- Three.js + GSAP 3D 배경
- 3D 배경 지연 로드
- 일시정지 시 화면 애니메이션 정지
- 한국어/영어 i18n
- 모바일 우선 반응형 레이아웃

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Vanilla JavaScript, ES Modules, Vite 8 |
| Visual | Three.js, GSAP, CSS animation |
| Auth / DB | Supabase Auth, PostgreSQL, RLS |
| Sync | Supabase Realtime, BroadcastChannel, polling fallback |
| Widget | Document Picture-in-Picture API |
| Test | Vitest, jsdom, Playwright |
| Deploy | GitHub Actions, GitHub Pages |

---

## 프로젝트 구조

```text
Tomato/
├─ index.html
├─ README.md
├─ vite.config.js
├─ playwright.config.js
├─ package.json
├─ e2e/
│  ├─ smoke.spec.js
│  └─ auth-flow.spec.js
├─ src/
│  ├─ main.js
│  ├─ state.js
│  ├─ timer.js
│  ├─ i18n.js
│  ├─ style.css
│  ├─ three-scene.js
│  ├─ repositories/
│  │  ├─ task.repository.js
│  │  ├─ history.repository.js
│  │  ├─ session.repository.js
│  │  ├─ preference.repository.js
│  │  └─ command.repository.js
│  ├─ services/
│  │  ├─ archiveInsight.service.js
│  │  ├─ archiveQuery.service.js
│  │  ├─ authValidation.service.js
│  │  ├─ command.service.js
│  │  ├─ exportImport.service.js
│  │  ├─ focusFlow.service.js
│  │  ├─ historyInsight.service.js
│  │  ├─ offlineQueue.service.js
│  │  ├─ ritualStarter.service.js
│  │  ├─ sessionRecovery.service.js
│  │  ├─ subdivide.service.js
│  │  ├─ sync.service.js
│  │  ├─ taskIdentity.service.js
│  │  ├─ timer.service.js
│  │  ├─ timerVisualState.service.js
│  │  └─ widgetSync.service.js
│  ├─ supabase/
│  │  ├─ auth.service.js
│  │  └─ client.js
│  ├─ utils/
│  │  ├─ dateTime.js
│  │  ├─ id.js
│  │  ├─ runtime.js
│  │  └─ safeStorage.js
│  ├─ widget/
│  │  └─ pip.js
│  └─ tests/
├─ supabase/
│  └─ migrations/
│     └─ 001_init_tomato.sql
├─ docs/
│  └─ current-progress-assessment-2026-06-25.md
└─ .github/
   └─ workflows/
      ├─ e2e.yml
      └─ web-deploy.yml
```

---

## 아키텍처

Tomato의 계층은 다음 흐름을 따릅니다.

```text
사용자 입력
→ main.js / timer.js
→ state.js
→ services/*
→ repositories/*
→ Supabase
```

각 계층의 책임:

- `main.js`: DOM 렌더링, 이벤트 바인딩, 화면 전환
- `timer.js`: 집중/휴식 타이머 엔진과 완료 기록 생성
- `state.js`: 전역 상태, 저장, BroadcastChannel 동기화
- `services/*`: 순수 로직과 비즈니스 규칙
- `repositories/*`: Supabase 테이블 입출력
- `widget/pip.js`: Document PiP 위젯 창 생성과 업데이트

상태 동기화 흐름:

```text
appState 변경
→ saveTasks / saveSession / appendHistoryItem
→ Supabase 저장
→ BroadcastChannel 전파
→ tomato:statechange 이벤트
→ 현재 화면과 위젯 갱신
```

---

## 데이터 모델

Supabase migration은 `supabase/migrations/001_init_tomato.sql`에 있습니다.

| 테이블 | 용도 |
|---|---|
| `profiles` | 사용자 프로필 |
| `focus_tasks` | 집중 작업 계획 |
| `current_sessions` | 현재 진행 중인 세션 |
| `focus_history` | 완료된 집중 기록 |
| `session_commands` | 교차 디바이스 명령 |
| `user_preferences` | 사용자 설정 |
| `device_clients` | 디바이스 등록 |

모든 주요 테이블은 Row Level Security를 켜고, 사용자가 본인 데이터만 접근하도록 정책을 둡니다.

---

## 개발 환경

### 요구 사항

- Node.js 20 이상 권장
- npm
- Supabase 프로젝트

### 설치

```bash
npm install
```

### 환경 변수

`.env` 또는 배포 환경에 아래 값을 설정합니다.

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BASE_PATH=/Tomato/
```

GitHub Pages 프로젝트 사이트는 `/Tomato/`를 base path로 사용합니다. 커스텀 도메인 루트에 배포할 때는 `/`로 바꿉니다.

### 개발 서버

```bash
npm run dev
```

기본 Vite 개발 서버:

```text
http://localhost:5173/
```

### 테스트

```bash
npm test
```

현재 테스트는 Vitest/jsdom 기반입니다. 주요 서비스 로직, 저장소 어댑터, 인증 검증, 타이머, 작업 동기화, UI 표면 회귀를 검사합니다.

### E2E 테스트

```bash
npm run test:e2e
```

Playwright 기반 브라우저 스모크 테스트입니다.

- `e2e/smoke.spec.js`: 로그인 없이 실행되는 부팅/auth-gate/입력 검증/i18n/오프라인 배지/모바일 overflow 검사
- `e2e/auth-flow.spec.js`: 실제 로그인 후 작업 생성/집중/휴식/아카이브 접근 검사

로그인 E2E는 확인 완료된 Supabase 테스트 계정이 필요합니다. 환경 변수가 없으면 해당 tier는 자동으로 skip됩니다.

```bash
E2E_EMAIL=you@example.com E2E_PASSWORD='...' npm run test:e2e
```

### 빌드

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

### 빌드 결과 미리보기

```bash
npm run preview
```

---

## 배포

현재 배포 경로는 GitHub Pages입니다.

```text
main branch push
→ GitHub Actions
→ npm ci
→ npm test
→ npm run build
→ dist 배포
→ gh-pages branch
→ GitHub Pages
```

배포 워크플로:

```text
.github/workflows/web-deploy.yml
```

E2E 스모크 워크플로:

```text
.github/workflows/e2e.yml
```

필요한 GitHub Secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Supabase Auth 설정:

```text
Site URL: https://deephoon.github.io/Tomato/
Redirect URL: https://deephoon.github.io/Tomato/**
Redirect URL: http://localhost:5173/**
Email provider: enabled
Confirm email: enabled
```

중요:

- Confirm email이 꺼져 있으면 앱은 로그인/회원가입을 차단합니다.
- GitHub Pages 배포는 정적 파일만 배포합니다.
- Supabase Edge Function은 별도 배포 대상입니다.

---

## 현재 검증 상태

최근 확인 기준:

```text
npm test
→ 21 test files passed
→ 112 tests passed

npm run test:e2e
→ 7 passed
→ 2 skipped (auth tier, E2E_EMAIL/E2E_PASSWORD 미설정)

npm run build
→ production build success
```

현재 i18n 사전:

```text
en: 200 keys
ko: 200 keys
missing: 0
```

빌드 산출물 예시:

```text
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
dist/assets/three-scene-*.js
```

현재 남아 있는 빌드 경고:

- `three-scene` 청크가 500 kB 이상입니다.
- `preference.repository.js`가 정적 import와 동적 import에 동시에 걸려 Vite의 `INEFFECTIVE_DYNAMIC_IMPORT` 경고가 납니다.

둘 다 현재 배포 차단 오류는 아니지만, 성능 정리 시 다시 봐야 합니다.

---

## 현재 한계

### 실제 LLM은 아직 운영 기능이 아니다

`작업 나누기`는 현재 로컬 휴리스틱입니다. 실제 Claude/OpenAI 같은 LLM 호출은 아직 운영 기능으로 연결되어 있지 않습니다.

`archiveInsight.service.js`는 `generate-insight` Supabase Edge Function 호출을 시도하지만, 실패하면 로컬 fallback을 사용합니다. 이 기능을 제품 핵심 AI 기능으로 내세우려면 Edge Function 배포와 비용/오류/보안 설계가 추가로 필요합니다.

### 완전한 PWA가 아니다

현재는 일반 웹앱입니다. 설치형 PWA나 완전 오프라인 앱으로 광고하면 안 됩니다.

PWA로 전환하려면 아래가 필요합니다.

- manifest
- 아이콘 asset
- service worker registration
- hashed asset precache
- 업데이트 전략

### 다중기기 충돌 해결은 단순하다

현재 작업 저장은 로컬 현재 목록을 기준으로 원격 row를 정리합니다. 삭제/중복 문제 해결에는 효과적이지만, 여러 기기에서 동시에 작업을 수정하는 경우 충돌 해결 전략이 아직 충분하지 않습니다.

추가로 필요한 것:

- `updated_at` 기반 stale write 방지
- 작업별 create/update/delete 명령 분리
- 삭제 tombstone 또는 충돌 해결 UI

### E2E 테스트는 시작됐지만 범위가 아직 제한적이다

현재 Playwright E2E는 있습니다. 다만 기본 CI에서 안정적으로 돌리는 no-auth smoke와, 테스트 계정이 있을 때만 실행되는 auth tier로 나뉘어 있습니다.

현재 더 보강해야 하는 범위:

- 회원가입 후 실제 이메일 확인까지 포함한 흐름
- 작업 수정/삭제 E2E
- 다중 탭 동기화 E2E
- PiP 지원/미지원 브라우저 분기
- 모바일 viewport 추가 케이스

---

## 문서

현재까지 진행 상태와 남은 리스크를 더 자세히 정리한 문서:

```text
docs/current-progress-assessment-2026-06-25.md
```

---

## 향후 작업

우선순위가 높은 순서:

1. Supabase 운영 설정 체크리스트 문서화
2. 로그인 포함 E2E를 테스트 계정/스테이징 Supabase로 CI 확장
3. README와 배포 문서의 수치/명령 자동 정합성 개선
4. 다중기기 충돌 방어
5. 모바일 화면 실기기 검증
6. 실제 LLM 기반 작업 나누기 검토
7. PWA 전환 여부 결정

---

## 현재 상태 요약

Tomato는 현재 **소규모 공개 베타가 가능한 개인 집중 리추얼 웹앱**입니다.

이미 갖춘 것:

- 이메일 확인 기반 로그인
- 오늘 작업 생성/관리
- 집중/휴식 타이머
- 실제 집중 시간 기록
- 아카이브 회고
- 기본 클라우드 동기화
- 동기화 상태 표시와 실패 저장 재시도
- no-auth Playwright 스모크 테스트
- GitHub Pages 자동 배포

아직 더 필요한 것:

- 로그인/다중기기까지 포함한 E2E 확장
- Supabase 운영 체크리스트
- 동기화 충돌 방어
- 실제 LLM 또는 AI 표현 정리

제품을 한 문장으로 정리하면:

> Tomato는 오늘의 집중을 계획하고 실행한 뒤, 실제 집중 기록으로 다시 돌아보는 개인용 포커스 리추얼 서비스입니다.
