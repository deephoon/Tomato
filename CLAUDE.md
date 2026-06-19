# CLAUDE.md

Tomato — 개인화 집중 리추얼 웹앱. Vanilla JS ESM + Vite, Three.js/GSAP 비주얼, Supabase 백엔드, Document PiP 위젯.

## Commands
- `npm run dev` — Vite dev 서버 (http://localhost:5173)
- `npm run build` — 프로덕션 빌드 → `dist/`
- `npm run preview` — 빌드 결과 미리보기
- `npm test` — vitest 1회 실행 (CI/검증용)
- `npm run test:watch` — vitest watch

빌드/테스트는 `.env`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 사용한다 (`.env.example` 참고). `.env`는 gitignore됨.

## Architecture
계층: **repositories → services → main.js (DOM/렌더 오케스트레이션)**.

- `src/state.js` — `appState` 단일 스토어 + 영속화. `tasks`/`history`/`session`/`prefs`를 보유하고 repository로 위임.
- `src/repositories/*.repository.js` — Supabase 데이터 접근(`focus_history`, `tasks`, `user_preferences`, …). 로그인 사용자(`userId`)가 없으면 no-op.
- `src/services/*.service.js` — 로직. 순수 분석/쿼리 함수(예: `historyInsight`, `archiveQuery`)와 부수효과 서비스(`sync`, `offlineQueue`, `sessionRecovery` 등)가 섞여 있다.
- `src/main.js` (~2100줄) — 모든 `render*`/`bind*` + 뷰 전환. DOM의 단일 소유자.
- `src/timer.js` — `Date.now()` 기반 정밀 타이머. 집중 완료 시 `completionKey`로 중복 제거하며 history를 기록.
- `src/i18n.js` — `dict.en` / `dict.ko` 사전.
- `src/three-scene.js`, `src/widget/pip.js` — 3D 배경, Document PiP 플로팅 위젯.
- `src/tests/*.test.js` — vitest (jsdom). 순수 서비스 함수를 테스트한다.

## Conventions
- **커밋 메시지는 한국어 Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `wip:`). AI 공동저자 푸터는 쓰지 않는다.
- **테스트 가능한 로직은 `services/*.service.js`의 순수 함수로 추출**하고 `src/tests/`에 vitest 테스트를 추가한다 (`historyInsight`, `archiveQuery`가 본보기). main.js는 그 함수를 호출해 DOM만 그린다.
- 분석/집계는 서비스가 **단일 진실 공급원**: 직접 history를 reduce하지 말고 해당 서비스 함수를 쓴다.
- 새 문자열은 `i18n.js`의 en/ko **양쪽**에 키를 추가한다.

## i18n DOM 바인딩 (틀리기 쉬움)
`updateI18nDOM()`이 처리하는 속성:
- `data-i18n="key"` → 요소의 `innerHTML`(또는 `input[type=button]`의 `value`)에 번역 주입. `<option>`에도 사용 가능.
- `data-i18n-ph="key"` → `placeholder` 속성에 주입. (※ `data-i18n-placeholder` 아님)

## 런타임 주의점
- **history는 Supabase 인증이 있어야 영속화된다.** 게스트/로컬 history 영속화 경로는 없으므로, 로그아웃 상태에서는 기록이 비어 보인다.
- **`renderAll()`은 `init()`에서 무조건 1회 실행**되고, 이후 `tomato:statechange`/`tomato:auth-ready`/`tomato:cloud-loaded`/`tomato:userchange`마다 호출된다. `renderAll` 안에서 던져진 예외는 그 시점부터 렌더 사이클(뒤따르는 `updateI18nDOM` 등)을 중단시키므로 조용한 회귀를 만든다 — render 경로에서 **정의되지 않은 함수 호출/throw를 절대 남기지 말 것**.
- 타이머는 100ms로 tick하되 표시 초(MM:SS)가 바뀔 때만 `statechange`를 dispatch한다. 렌더는 idempotent해야 한다.
- 3D(`init3DScene`)는 헤드리스/비WebGL 환경에서 실패할 수 있어 `try/catch`로 감싸져 있다 — 헤드리스 스모크의 WebGL 콘솔 에러는 정상.

## 검증
- 변경 후: `npm test` + `npm run build` 통과 확인. `node --check src/main.js`로 구문 빠르게 점검 가능.
- 런타임 스모크: dev 서버를 띄우고 헤드리스 Chrome + CDP(WebSocket)로 부팅 시 uncaught 예외 0건과 주요 UI 동작을 확인할 수 있다.

## 배포
`main` 브랜치 push → `.github/workflows/web-deploy.yml`이 `npm test` → `npm run build` → GitHub Pages 배포. Supabase 키는 repo secrets(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
