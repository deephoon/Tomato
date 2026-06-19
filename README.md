# Tomato — 개인화 집중 리추얼 서비스 (Media-Art Edition)

> **Night × Imperial Ritual Interface**
> 단순한 포모도로 타이머를 넘어, 집중을 하나의 '의식(Ritual)'으로 승화시키는 개인화 집중 관리 도구. 

Tomato는 사용자가 오늘의 집중 블록을 만들고, 실행하고, 기록을 회고하는 연속적인 흐름을 설계하는 서비스입니다. 현재 버전은 **Vanilla JS + Three.js + GSAP** 기반의 Web SPA 구조로, **Supabase**를 활용한 클라우드 동기화와 **Document Picture-in-Picture(PiP)** 기반의 브라우저 네이티브 플로팅 위젯을 제공합니다.

특히 이번 버전(V11)부터는 **미디어아트 전시물**과 같은 감각적 피드백(Night × Imperial 테마, 3D Monolith 배경, CRT 픽셀 효과 등)을 더하여 사용자에게 더 깊은 몰입감을 제공합니다.

---

## 1. 제품 개요 및 철학

### 1.1. 핵심 목표
Tomato의 궁극적인 목표는 사용자의 업무 흐름을 끊김 없이 이어주는 것입니다.
```text
로그인 → 오늘 집중 계획(Plan) → 집중 실행(Focus) → 휴식(Break) → 대기(Standby) → 기록 저장(Archive)
```
단순 작업 목록이 아닌, 세션 하나하나를 명확한 "시작과 종료가 있는 기록 단위"로 다루어, 집중의 리듬을 관리합니다.

### 1.2. 디자인 철학 (Night × Imperial)
* **미디어아트 감성 (3D & GSAP)**: Three.js를 활용하여 픽셀화된 3D 모노리스(Monolith) 배경과 입자 필드를 렌더링. 사용자의 상태(idle, running, paused)에 따라 배경이 반응합니다.
* **Pixel HUD & Functional UI 분리**:
  * **Pixel HUD**: 시계, 제목, CTA 버튼 등은 픽셀 폰트(Silkscreen)를 사용하여 시스템/모니터링 장치의 감성을 전달.
  * **Functional UI**: 작업 목록, 메타데이터 등은 고정폭 폰트(JetBrains Mono)로 실질적 가독성을 보장.
* **Hero Red 원칙**: 액센트 컬러(`#FB3640`)는 "신호, 활성, 에너지"에만 제한적으로 사용하여 긴장감을 유지합니다. 

---

## 2. 주요 기능 및 아키텍처 현황

### 2.1. 전체 아키텍처
* **Front-end**: Vanilla JavaScript ES Modules, Vite 8
* **Visuals/Animation**: Three.js (3D Background), GSAP (Transitions)
* **Storage/Backend**: Supabase (PostgreSQL, Auth, Realtime Sync), localStorage (Offline Fallback)
* **Widget**: Document Picture-in-Picture (PiP) API (웹 네이티브)

### 2.2. 로그인과 개인화 (Auth & Profile)
* Supabase Auth 연동을 통한 이메일 기반 회원가입/로그인.
* `user_preferences`, `tasks`, `history` 등 DB 스키마 완벽 분리 및 서버 동기화 완료.
* 브라우저 세션 재시작 시 로그인 정보와 함께 클라우드 워크스페이스(Cloud Workspace) 완벽 복원.

### 2.3. 주요 화면 (Views)
1. **HOME (Dashboard)**
   * 오늘의 메인 집중 카드, 집중 시그널 바(Signal Status Bar), 오늘 집중 슬롯 목록 제공.
   * "시계 + 작업 정보"를 조합한 강력한 Hero 카드를 통해 즉시 몰입을 유도.

2. **PLANNER (계획 및 캘린더)**
   * **좌우 분할 뷰(Split Pane)**: 좌측은 월간 캘린더, 우측은 선택 날짜의 집중 큐 및 작업 상세 정보.
   * 캘린더에서 항목 클릭 시 우측에 상세 정보 제공 및 즉시 "집중 시작" 가능.

3. **FOCUS & TIMER (집중 스테이지)**
   * 남은 시간에 따른 **단계별 분위기 전환(Phase-based ambient shift)**.
   * 백그라운드에서는 느린 폴리곤 회전과 맥박 치는 듯한 효과를, 포그라운드에서는 선명한 픽셀 타이머를 띄움.
   * 브라우저 탭 백그라운드 지연 방지를 위해 `Date.now()` 기반으로 타이머 정확성 보장.

4. **BREAK & STANDBY (휴식 및 대기)**
   * 집중 완료 시 자동 휴식 전환. 휴식이 끝나면 대기(Standby) 모드로 진입하여 다음 작업을 준비.

5. **ARCHIVE (기록 및 회고 공간)**
   * "기억의 금고(Memory Vault)" 스타일로, 세션이 끝나면 아카이브 카드로 누적.
   * **디테일 시트**: 카드 클릭 시 작업의 지속 시간, 신호 강도, 시스템 회고록(System Reflection) 등 상세 제공.

### 2.4. 플로팅 위젯 (Document PiP)
* 기존 Tauri 데스크톱 앱 방식을 제거하고, 브라우저 표준 기술인 **Document Picture-in-Picture API**를 도입.
* 메인 웹페이지 밖으로 팝업되는 플로팅 창을 통해 별도의 프로그램 설치 없이 메인 화면과 **0.1초 만에 완벽하게 상태가 동기화**되는 미니멀 타이머 역할 수행.
* 미디어아트 에디션의 CRT 스캔라인, 비네팅, 노이즈 필터 효과가 위젯 창 내부에 동일하게 적용됨.
* (주의사항: 브라우저 보안 정책 상 상단의 기본 브라우저 주소창/타이틀바는 노출됩니다.)

---

## 3. 데이터 모델 (Supabase 적용 완료)

* **user_preferences**: `user_id, lang, focusMinutes, breakMinutes ...`
* **tasks**: `id, user_id, title, focusMinutes, breakMinutes, status, targetDate, order`
* **history**: `id, user_id, title, focusMinutes, completedAt, date, sequence, systemNote`

---

## 4. 배포 안정화 작업 (완료)

배포 직전 안정화 라운드에서 다음이 정리되었습니다.

* **안정성**: 런타임 판별 단일화(`utils/runtime.js`)로 전역 누수 제거, 위젯 휴식 완료/스킵 버그 수정, Tauri 잔재·의존성 전면 제거. 테스트 47건 통과.
* **UX 플로우**: 수동 완료 시 회고/휴식/대기를 고르는 완료 모멘트 도입, 상태 텍스트를 단일 출처로 통합해 메인↔위젯 동기화 일관성 확보.
* **AI Subdivide**: 제목 키워드 기반 작업유형 추론(글/학습/개발/디자인/회의)으로 의미있는 단계 생성 + 적용 전 인라인 편집 (로컬 휴리스틱, 결정론적).
* **위젯(PiP)**: 원형 진행 링 + 단계별 컬러 전환 + CRT 디테일로 적극 리디자인, 전용 모듈(`widget/pip.js`)로 분리.

## 5. 향후 로드맵 및 개발 목표

### 5.1. 서비스 품질 고도화 (P1)
* 실제 LLM(Claude API 등) 연동을 통한 작업 세분화 고도화 (현재는 로컬 휴리스틱).
* 핵심 플로우(완료 모멘트, 위젯 동기화)에 대한 통합 테스트 확장.

### 5.2. PWA 모바일 및 데스크톱 독립 실행 최적화 (P2)
* **현재 빌드는 일반 웹앱입니다.** 오프라인/설치형 PWA(Service Worker 등록, manifest, hashed-asset precache)는 아직 구현되어 있지 않습니다.
* (향후) PWA(Progressive Web App) 전환 — Service Worker 자산 precache + Window Controls Overlay로 네이티브 앱 같은 경험 제공.

---

## 6. 실행 및 배포

웹 개발 서버 실행:
```bash
npm install
npm run dev
```

프로덕션 빌드:
```bash
npm run build   # dist/ 생성
npm run preview # 빌드 결과 미리보기
```

테스트:
```bash
npm test
```

현재 로컬 개발 서버 주소: `http://localhost:5173/`
