# Tomato — 배포 안정화 & 폴리시 설계

날짜: 2026-06-18
상태: 승인됨 (사용자 확인 완료)

## 목표

배포 직전 기준으로 Tomato를 안정화하고, 기능 디테일·UX 플로우·위젯 디자인을 마감한다.

**범위 결정 (사용자 확정):**
- 우선순위: **안정화 우선 + 폴리시** (2264줄 `main.js` 대규모 모듈 분할은 이번 범위 제외)
- AI Subdivide: **로컬 휴리스틱 정교화** (실제 LLM 연동 없음)
- 위젯(PiP): **적극 리디자인**

비목표(Non-goals): main.js 전면 분할, 실제 LLM/백엔드 연동, PWA Window Controls Overlay, 신규 화면 추가.

## 현황 진단 (코드 확인 완료)

### 실제 버그
1. `src/services/command.service.js:14` — `isWidget()` 호출하나 해당 모듈에 정의/import 없음. 브라우저에선 `window.isWidget` 전역이 새어들어 우연히 동작하지만 테스트 환경에선 ReferenceError. 현재 테스트 1건 에러의 원인.
2. `src/main.js:363` — PiP 위젯 휴식 중 "DONE" 클릭 시 `completeBreak()` 호출하나 어디에도 정의 없음 → ReferenceError로 위젯 휴식 완료 불가.
3. `src/main.js:2043` — 휴식 스킵이 `resetSession(); endBreak();` 이중 호출. `resetSession()`이 `activeTaskId`를 비워 `endBreak()` 내부의 다음 리추얼 자동 선택이 컨텍스트를 잃음.
4. Tauri 잔재: `isTauri`/`beginWindowDrag`/`beginWindowResize`/`hideWidgetSelf` 등 빈 스텁, `@tauri-apps/api`·`@tauri-apps/cli` 의존성 잔존(PiP 전환 후 죽은 코드).

### 양호 (유지)
타이머 정밀도(`Date.now()` 기반), 세션 복구, completionKey 중복 방지, repository/service 계층 분리, 테스트 37건 통과.

## 워크스트림

### A. 안정화

**A1. 런타임 판별 일원화**
- 신설: `src/utils/runtime.js` — `isWidget()`, `isPipActive()` 등 환경 판별을 한 곳에서 export.
- `command.service.js`, `main.js`가 이 모듈을 import. `window.isWidget` 전역 의존 제거.
- 인터페이스: `isWidget(): boolean` (PiP/일반 컨텍스트 판별). 의존성 없음(순수 함수 + 전역 window 참조).

**A2. 휴식 완료 단일 경로**
- `endBreakManually()` (또는 기존 `skipBreak`/`endBreak` 정리) 단일 함수로 휴식 종료 로직 통합.
- 메인 UI의 break 컨트롤과 PiP "DONE"이 동일 함수 호출. `completeBreak` 미정의 제거.

**A3. 휴식 스킵 버그 수정**
- 이중 호출 제거. 다음 리추얼 자동 선택 컨텍스트(`completedTaskId`) 보존.

**A4. Tauri 잔재 제거**
- 죽은 스텁 함수 제거 또는 runtime.js로 흡수.
- `package.json`에서 `@tauri-apps/*` 의존성 제거. 빌드 정상 확인.

**A5. 회귀 테스트**
- runtime 판별, break-complete 단일 경로, skip-break 컨텍스트 보존에 대한 테스트 추가.
- 기존 sessionRecovery 테스트 에러 해소 확인.

### B. UX 플로우 마감

**B1. 집중 완료 → 휴식 전환 명시화**
- 현재 `completeFocus` 후 `handleTimerEnd`가 자동으로 `enterBreakMode()` 호출.
- 사용자 선택 존중: 완료 직후 "휴식 시작 / 회고 작성 / 건너뛰기" 모멘트를 UI에서 명확히. 강제 자동 전환을 사용자 제어 가능한 흐름으로.
- 기존 동작과의 호환: 타이머 자연 만료 시의 흐름과 수동 완료 시의 흐름을 일관되게.

**B2. 빈 상태(empty state) 일관화**
- 오늘 작업 0개(HOME), 아카이브 0개(ARCHIVE), 플래너 선택일 작업 0개일 때 안내 문구 + CTA를 일관된 톤으로.

**B3. 상태 피드백 동기화 점검**
- 일시정지/재개/완료 시 상태 텍스트 + 3D 모드 + 위젯이 항상 일치하도록 누락 케이스 점검·보정.

### C. AI Subdivide 로컬 정교화

**C1. 의미 기반 단계 생성**
- `generateSubdivisionBlocks(title, total)` 개선: 제목 키워드로 작업 유형 추론(작성/학습/개발/회의/디자인/기타)하여 유형별 단계명 템플릿 적용.
- 총 시간에 비례한 자연스러운 분할, 블록 간 휴식 삽입 로직 정리.
- 결정론적(동일 입력 → 동일 출력은 아니어도 합리적), 실제 LLM 없음.

**C2. 적용 전 편집**
- 생성된 블록을 적용(APPLY) 전에 인라인으로 제목/시간 편집 가능.

### D. 위젯(PiP) 적극 리디자인

**D1. 마크업/스타일 분리**
- `requestWidgetOpen` 내 인라인 스타일 문자열 → 전용 모듈(`src/widget/pip.js` 또는 `pip.styles.js` + 템플릿)로 분리. main.js 비대화 완화.

**D2. 시각 리디자인**
- 원형 진행 링(conic-gradient 기반) + 중앙 픽셀 시계.
- 단계별 컬러 전환: focus(red) → 막바지 tension 강조, break(green) 테마.
- CRT 디테일(스캔라인/그레인/비네팅/코너 마커)을 메인 화면과 동일 수준으로.
- 컴팩트한 컨트롤: 일시정지/재개 · 완료 · 닫기. 작업명 표시.
- 320×200 기준 반응형 레이아웃.

**D3. 동기화 무결성**
- `updateFocusHUD`의 PiP 동기화 블록을 새 마크업에 맞게 갱신. 0.1초 동기화 유지.

## 검증

- 각 워크스트림: 해당 테스트/수동 확인.
- 최종: `npm test` 전체 그린 + 개발 서버에서 핵심 플로우(집중 → 휴식 → 대기, 위젯 열기/동기화/완료/닫기) 수동 확인.
- 빌드: `npm run build` 성공(Tauri 의존성 제거 후 회귀 없음).

## 리스크 / 주의

- `main.js`는 분할하지 않되, 위젯/AI 로직을 별 모듈로 추출하는 선에서만 비대화 완화(행위 보존).
- 자동 휴식 전환을 사용자 선택으로 바꾸는 변경(B1)은 기존 사용자 흐름을 깨지 않도록 신중히. 기본 동작 회귀 확인 필수.
- PiP는 Chrome/Edge 등 지원 브라우저에서만 수동 확인 가능(코드 검증 + 가능 시 실행).
