# Tomato — 개인화 집중 리추얼 서비스 (Media-Art Edition)

> **Night × Imperial Ritual Interface**
> 단순한 포모도로 타이머를 넘어, 집중을 하나의 '의식(Ritual)'으로 승화시키는 개인화 집중 관리 도구.

Tomato는 사용자가 오늘의 집중 블록을 만들고(Plan), 실행하고(Focus), 기록을 회고하는(Archive) 연속적인 흐름을 설계하는 웹 서비스입니다. **Vanilla JS + Vite + Three.js + GSAP** 기반의 SPA이며, **Supabase**로 클라우드 동기화를, **Document Picture-in-Picture(PiP)** API로 브라우저 네이티브 플로팅 위젯을 제공합니다.

```text
로그인 → 오늘 집중 계획(Plan) → 집중 실행(Focus) → 휴식(Break) → 대기(Standby) → 기록 저장(Archive)
```

세션 하나하나를 "시작과 종료가 있는 기록 단위"로 다루어, 집중의 리듬을 관리합니다.

---

## 1. 디자인 철학 (Night × Imperial)

* **미디어아트 감성 (3D & GSAP)**: Three.js로 픽셀화된 3D 모노리스(Monolith) 배경과 입자 필드를 렌더링. 사용자 상태(idle/running/paused)에 따라 배경이 반응합니다. (성능을 위해 첫 paint 이후 지연 로드 — 아래 §6 참조)
* **픽셀 타이포그래피 통일**: 모든 텍스트를 픽셀 폰트로 통일했습니다. 라틴은 **Silkscreen**, 한글은 **Galmuri**(실제 웹폰트 로드)로 영·한 모두 픽셀 일관성을 유지합니다. 픽셀 폰트 가독성을 위해 타입 스케일은 상향 조정되어 있습니다.
* **Hero Red 원칙**: 액센트 컬러(`#FB3640`)는 "신호, 활성, 에너지"에만 제한적으로 사용해 긴장감을 유지합니다.
* **여백 일관성**: 패널 패딩·카드 간격을 전 화면(Home/Focus/Planner/Archive)에서 동일한 스페이싱 토큰으로 통일했습니다.

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| Front-end | Vanilla JavaScript (ES Modules), Vite 8 |
| Visuals / Animation | Three.js (3D 배경), GSAP (전환 애니메이션) |
| Backend / Storage | Supabase (PostgreSQL + Auth + Realtime, RLS 적용) |
| 위젯 | Document Picture-in-Picture API (브라우저 네이티브) |
| 교차 탭/창 동기화 | BroadcastChannel |
| 테스트 | Vitest (jsdom), 66 tests |
| 배포 | GitHub Actions → GitHub Pages |

---

## 3. 프로젝트 구조

계층 구조는 **repositories → services → state → main.js (DOM/렌더 오케스트레이션)** 입니다.

```text
Tomato/
├─ index.html                  # 앱 셸 + 모든 뷰 마크업 + 폰트 로드
├─ vite.config.js              # Vite + Vitest(jsdom) 설정
├─ src/
│  ├─ main.js                  # (~2,160줄) 모든 render*/bind* + 뷰 전환. DOM의 단일 소유자
│  ├─ state.js                 # appState 단일 스토어 + 영속화 + BroadcastChannel 동기화
│  ├─ timer.js                 # Date.now() 기반 정밀 타이머, 집중 완료 시 history 기록
│  ├─ i18n.js                  # en/ko 사전 (각 206키, 완전 정합)
│  ├─ three-scene.js           # 3D 모노리스 배경 (three+gsap, 지연 로드 대상)
│  ├─ style.css                # (~2,630줄) 디자인 토큰 + 전 화면 스타일
│  │
│  ├─ repositories/            # ── Supabase 데이터 접근 계층 (userId 없으면 no-op)
│  │  ├─ task.repository.js          # focus_tasks
│  │  ├─ history.repository.js       # focus_history (completion_key 중복 제거)
│  │  ├─ session.repository.js       # current_sessions
│  │  ├─ preference.repository.js    # user_preferences
│  │  └─ command.repository.js       # session_commands (교차 디바이스 명령)
│  │
│  ├─ services/                # ── 로직 계층 (순수 함수 + 부수효과 서비스)
│  │  ├─ archiveQuery.service.js     # [순수] 아카이브 필터→검색→정렬→그룹 파이프라인
│  │  ├─ archiveInsight.service.js   # 아카이브 패턴 인사이트 (로컬)
│  │  ├─ historyInsight.service.js   # [순수] 집중 통계 단일 소스 (actualSeconds 기준)
│  │  ├─ focusFlow.service.js        # [순수] 다음 집중 후보 선택
│  │  ├─ ritualStarter.service.js    # [순수] 오늘의 오픈 태스크
│  │  ├─ subdivide.service.js        # [순수] 작업 세분화 (로컬 휴리스틱, 결정론적)
│  │  ├─ timer.service.js            # [순수] completionKey 생성 등 타이머 유틸
│  │  ├─ session.service.js          # 세션 상태 트랜지션
│  │  ├─ sessionRecovery.service.js  # 새로고침/재접속 시 진행 세션 복원
│  │  ├─ sync.service.js             # Supabase Realtime 동기화
│  │  ├─ offlineQueue.service.js     # 오프라인 쓰기 큐잉 → 재연결 시 flush
│  │  ├─ command.service.js          # 교차 디바이스 명령 실행
│  │  ├─ widgetSync.service.js       # 메인 ↔ 위젯 상태 스냅샷
│  │  └─ exportImport.service.js     # 데이터 백업/복원(JSON)
│  │
│  ├─ supabase/
│  │  ├─ client.js                   # Supabase 클라이언트 (env 키)
│  │  └─ auth.service.js             # 이메일 확인 기반 회원가입/로그인/로그아웃
│  │
│  ├─ widget/
│  │  └─ pip.js                      # Document PiP 플로팅 위젯 (원형 진행 링 + CRT)
│  │
│  ├─ utils/
│  │  ├─ dateTime.js                 # 날짜 포맷 헬퍼
│  │  ├─ id.js                       # ID 생성
│  │  ├─ runtime.js                  # 런타임 판별 (PiP 지원 등) 단일화
│  │  └─ safeStorage.js              # 안전한 localStorage 래퍼
│  │
│  └─ tests/                   # ── Vitest (jsdom), 순수 서비스 함수 중심 66 tests
│
├─ supabase/migrations/        # 001_init_tomato.sql (7 테이블 + RLS 정책)
├─ .github/workflows/          # web-deploy.yml (test → build → Pages)
└─ CLAUDE.md                   # 에이전트/기여자용 프로젝트 가이드(명령·컨벤션·주의점)
```

### 계층 책임

* **repositories** — Supabase 테이블에 대한 CRUD만 담당. 로그인 사용자(`userId`)가 없으면 no-op.
* **services** — 비즈니스 로직. `[순수]` 표시 모듈은 부수효과 없는 테스트 가능 함수(분석·쿼리·세분화)이고, 나머지는 동기화·복원·큐잉 등 부수효과 서비스.
* **state.js** — `appState` 단일 스토어(`tasks`/`history`/`session`/`prefs`/`auth`)를 보유하고 repository에 위임. 변경은 `BroadcastChannel('tomato-sync')`로 같은 브라우저의 다른 탭/위젯 창과 동기화.
* **main.js** — 모든 뷰의 `render*`/`bind*`와 화면 전환을 소유하는 DOM 오케스트레이터.

---

## 4. 데이터 흐름 & 동기화

```text
사용자 액션 → timer.js / main.js
        → state.js (appState 갱신)
        → repositories/* (Supabase 영속화, 로그인 시)
        → BroadcastChannel('tomato-sync')  → 다른 탭 / PiP 위젯 즉시 반영
        → CustomEvent('tomato:statechange') → 현재 화면 렌더 + HUD/위젯 갱신
```

* **타이머 정확성**: `timer.js`는 `Date.now()` 기반 100ms tick으로 동작하되, 표시 초(MM:SS)가 바뀔 때만 `statechange`를 dispatch해 재렌더를 최소화합니다. 집중 완료 시 `completionKey`로 history 중복 기록을 방지하고, 계획 시간(`plannedSeconds`)과 **실제 경과 시간(`actualSeconds`)**을 함께 기록합니다.
* **통계의 단일 소스**: 모든 집중 통계(오늘/주간/총/스트릭)는 `historyInsight.service`를 통해 **실제 `actualSeconds` 기준**으로 산출됩니다 (Home·Archive 일치).
* **오프라인**: 미연결 시 쓰기는 `offlineQueue.service`에 큐잉되고 재연결 시 flush됩니다.
* **세션 복원**: 새로고침/재접속 시 `sessionRecovery.service`가 진행 중이던 집중/휴식을 복원합니다.

---

## 5. 데이터 모델 (Supabase, RLS 적용)

모든 테이블은 Row Level Security가 적용되어 사용자는 본인 데이터만 접근합니다. (`supabase/migrations/001_init_tomato.sql`)

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|-----------|
| `profiles` | 사용자 프로필 | `id, display_name` |
| `focus_tasks` | 집중 작업(계획) | `title, focus_minutes, break_minutes, status, target_date, task_order, source` |
| `current_sessions` | 진행 중 세션(1인 1행) | `active_task_id, mode, is_running, end_time, remaining_seconds, completion_key` |
| `focus_history` | 완료 기록 | `title, planned_seconds, actual_seconds, completed_at, reflection, completion_type, completion_key(unique)` |
| `session_commands` | 교차 디바이스 명령 | `command, payload(jsonb), status, idempotency_key(unique)` |
| `user_preferences` | 사용자 설정 | `language, default_focus/break_minutes, widget_enabled, archive_insight_enabled` |
| `device_clients` | 디바이스 등록 | `device_type, device_name, platform, app_version` |

---

## 6. 성능 & 번들

초기 로딩 비용을 줄이기 위해 무거운 의존성을 critical path에서 분리했습니다.

* **Three.js + GSAP (~594 kB)** — `three-scene.js`를 동적 import + 첫 paint 후 `requestIdleCallback`로 지연 로드. 초기 번들에서 제외.
* **뷰 지연 렌더** — `renderAll()`은 현재 화면만 렌더하고 나머지(Home/Planner/Archive)는 `viewDirty`로 표시 → 진입 시 갱신. 기록이 쌓여도 Archive 렌더가 데이터 변경마다 발생하지 않습니다.
* 결과: 초기 JS gzip ≈ **240 kB → ~80 kB** (Three/GSAP는 idle 후 별도 청크로 로드).

> 참고: 위젯(`widget/pip.js`)은 `documentPictureInPicture.requestWindow()`가 **사용자 제스처(transient activation)**를 요구하므로 정적 import 유지(클릭 핸들러에서 `await import`하면 제스처가 소모되어 창이 열리지 않음).

---

## 7. 주요 화면 (Views)

1. **HOME** — 오늘의 메인 집중 카드(시계+작업), 집중 시그널 바, 오늘 집중 슬롯, 신호 통계(실제 집중시간 기준), 최근 리추얼.
2. **PLANNER** — 좌측 월간 캘린더 / 우측 선택 날짜의 배정·미배정 작업. 항목 클릭 시 상세 + 즉시 집중 시작.
3. **FOCUS & TIMER** — 남은 시간에 따른 단계별 분위기 전환, `Date.now()` 기반 정확한 픽셀 타이머. 작업 세분화(로컬 휴리스틱) 제공.
4. **BREAK & STANDBY** — 집중 완료 시 자동 휴식 → 대기 모드로 다음 작업 준비.
5. **ARCHIVE (기록)** — 날짜별 리추얼 카드 누적. **필터(전체/25분/50분+/연속) + 제목·메모 검색 + 정렬(최신·오래된·집중시간순)**. 카드 클릭 시 상세 시트(실제/계획 시간, 신호 강도, 회고). 데이터 백업/복원(Data Vault).

### 플로팅 위젯 (Document PiP)
브라우저 표준 Document Picture-in-Picture API로 메인 페이지 밖 플로팅 타이머를 띄웁니다. 원형 진행 링 + 단계별 컬러 + CRT 스캔라인/노이즈를 위젯 창에도 적용하며, BroadcastChannel로 메인과 즉시 동기화됩니다.

---

## 8. 현재까지 진행 상황

기능은 배포 가능 권역이며, 최근 라운드에서 다음을 정리했습니다.

* **아카이브 사용성** — 깨져 있던 필터(렌더 크래시) 복구 + 검색·정렬 추가, 순수 쿼리 모듈(`archiveQuery.service`)로 분리하고 단위 테스트 추가. 회고 영역 라벨 키 누락(`archiveLongestSession`/`archiveCalmest`) 수정.
* **성능** — Three/GSAP 지연 로드 + 뷰 지연 렌더로 초기 번들 대폭 축소(§6).
* **타이포그래피** — 픽셀 폰트 통일(Silkscreen+Galmuri), 한글 픽셀 폰트 실제 로드, 가독성 위해 타입 스케일 상향.
* **여백/배치** — Home·Focus·Planner·Archive 패널 패딩·카드 간격을 동일 토큰으로 통일.
* **실제 시간 반영** — Home 통계를 계획 시간이 아닌 실제 집중 시간(`actualSeconds`) 기준으로 일원화(Archive와 일치).
* **i18n** — en/ko 키 완전 정합(206/206), 영어에서 raw 키 노출되던 버그 수정.
* **위젯 안정화** — 지연 로드가 깨뜨렸던 PiP 열림(사용자 제스처) 회귀 수정.
* **PWA 정리** — 등록·링크되지 않던 sw.js/manifest 제거. **현재 빌드는 일반 웹앱**(오프라인/설치형 PWA 미구현).
* **하네스/CI** — 배포 전 `npm test` 게이트 추가(Node 20), 안전 명령 allowlist 정리, 완료 시 테스트 검증 훅.

**검증 기준**: `npm run build` 성공 · `npm test` 66/66 통과 · `vite preview`에서 `/`·JS·CSS 200.

---

## 9. 개발 & 배포

### 환경 변수
`.env` (예시는 `.env.example`):
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BASE_PATH=/Tomato/
```

`VITE_BASE_PATH`는 배포 경로용입니다. GitHub Pages 프로젝트 사이트는 `/Tomato/`를 사용하고, 커스텀 도메인 루트 배포 시에는 `/`로 바꿉니다.

### 명령
```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173/)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
npm test         # Vitest 1회 실행
npm run test:watch
```

### 배포
무료 배포 1순위는 **GitHub Pages + Supabase Free**입니다.

* 배포 URL: `https://deephoon.github.io/Tomato/`
* GitHub Actions: `main` 브랜치 push → `.github/workflows/web-deploy.yml`이 **`npm test` → `npm run build` → GitHub Pages** 순으로 배포
* GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
* Supabase Auth URL Configuration
  * Site URL: `https://deephoon.github.io/Tomato/`
  * Additional Redirect URLs: `https://deephoon.github.io/Tomato/**`, `http://localhost:5173/**`
* Supabase Auth Providers
  * Email provider: enabled
  * Confirm email: enabled
  * Confirm email이 꺼져 있으면 앱은 로그인/회원가입을 차단합니다.
  * 회원가입 직후 앱은 자동 로그인하지 않고 확인 메일 안내를 표시합니다. 확인되지 않은 이메일 세션은 앱에서 즉시 로그아웃 처리됩니다.

첫 배포 전 체크:
```bash
npm test
npm run build
git push origin main
```

GitHub Pages 설정에서 `gh-pages` 브랜치의 `/`를 publishing source로 선택하면 됩니다.

---

## 10. 향후 로드맵

* **P1** — 실제 LLM(Claude API 등) 연동 작업 세분화(현재 로컬 휴리스틱), 핵심 플로우 통합 테스트 확장.
* **P2** — (선택) 진짜 오프라인 PWA 전환: `vite-plugin-pwa`로 SW 등록 + manifest + hashed-asset precache.
