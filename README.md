# Tomato — 개인화 집중 리추얼 서비스 (Media-Art Edition)

> **Night × Imperial Ritual Interface**
> 단순한 포모도로 타이머를 넘어, 집중을 하나의 '의식(Ritual)'으로 승화시키는 개인화 집중 관리 도구. 

Tomato는 사용자가 오늘의 집중 블록을 만들고, 실행하고, 기록을 회고하는 연속적인 흐름을 설계하는 서비스입니다. 현재 프로토타입은 **Vanilla JS + Three.js + GSAP** 기반의 Web SPA와 **Tauri 위젯** 구조를 결합한 형태로, 로컬 프로필과 개인 기록 아카이브를 갖춘 제품형 구조로 발전하고 있습니다.

특히 이번 버전(V10)부터는 **미디어아트 전시물**과 같은 감각적 피드백(Night × Imperial 테마, 3D Monolith 배경 등)을 더하여 사용자에게 더 깊은 몰입감을 제공합니다.

---

## 1. 제품 개요 및 철학

### 1.1. 핵심 목표
Tomato의 궁극적인 목표는 사용자의 업무 흐름을 끊김 없이 이어주는 것입니다.
```text
로그인 → 오늘 집중 계획(Plan) → 집중 실행(Focus) → 휴식(Break) → 기록 저장(Archive) → 회고 및 다음 작업 시작
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
* **Desktop App**: Tauri 2.0 (Rust)
* **Storage**: 현재 브라우저 `localStorage` 기반 동작 (향후 Supabase 이관 준비)

### 2.2. 로그인과 개인화 (Auth & Profile)
* `auth.js`를 통한 로컬 사용자 프로필 시스템 구현.
* 비밀번호는 평문 저장이 아닌 **PBKDF2-SHA256 해싱** 방식을 적용.
* 계정별로 `tasks`, `history`, `session` 스토리지 키를 완전히 분리하여 다중 사용자 환경 지원.

### 2.3. 주요 화면 (Views)
1. **HOME (Dashboard)**
   * 오늘의 메인 집중 카드, 집중 시그널 바(Signal Status Bar), 오늘 집중 슬롯 목록 제공.
   * "시계 + 작업 정보"를 조합한 강력한 Hero 카드를 통해 즉시 몰입을 유도.
   * 진행 상황에 따라 시각적 피드백(Red Glow, PolyOutline 애니메이션) 반응.

2. **PLANNER (계획 및 캘린더)**
   * **좌우 분할 뷰(Split Pane)**: 좌측은 월간 캘린더, 우측은 선택 날짜의 집중 큐 및 작업 상세 정보.
   * 캘린더에서 항목 클릭 시 우측에 상세 정보 제공 및 즉시 "집중 시작" 가능.
   * AI 작업 세분화(AI Subdivide) 기능을 위한 UI 흐름(Prompting -> AI Output) 구조 통합.

3. **FOCUS & TIMER (집중 스테이지)**
   * 집중 생성과 실행을 한 곳으로 통합.
   * 남은 시간에 따른 **단계별 분위기 전환(Phase-based ambient shift)**.
   * 백그라운드에서는 느린 폴리곤 회전과 맥박 치는 듯한 효과를, 포그라운드에서는 선명한 픽셀 타이머를 띄움.
   * 브라우저 탭 지연 방지를 위해 `Date.now()` 기반으로 타이머 정확성 보장.

4. **BREAK (휴식)**
   * 집중 완료 시 자동 휴식 전환, 휴식 건너뛰기 기능.
   * 위젯 상에서도 완벽히 동기화.

5. **ARCHIVE (기록 및 회고 공간)**
   * "기억의 금고(Memory Vault)" 스타일로, 세션이 끝나면 아카이브 카드로 누적.
   * **디테일 시트**: 카드 클릭 시 작업의 지속 시간, 신호 강도, 링크된 플래너 슬롯, 시스템 회고록(System Reflection) 등 상세 제공.
   * 재실행(Re-execute) 버튼을 통한 즉각적인 리추얼 재진입.

### 2.4. 데스크톱 위젯 (Tauri)
* 단순한 브라우저 팝업이 아닌, 타이틀 바 없는 **투명 데스크톱 위젯**(`decorations: false`).
* `Always-on-top` 속성 및 창 드래그 기능 구현.
* 메인 화면과 통신하며(Focus 시작/종료 시), 방해 없는 미니멀 타이머 역할 수행.

---

## 3. 데이터 모델

* **Task**: `id, title, focusMinutes, breakMinutes, status, targetDate, order`
* **History**: Task 속성 + `completedAt, date, sequence, systemNote`
* **Session**: `activeTaskId, mode (idle/focus/break), remainingSeconds, isRunning, endTime, pomodoroCount...`

---

## 4. 향후 로드맵 및 개발 목표

### 4.1. 서버 및 클라우드 연동 (P0)
* Supabase Auth 및 Postgres DB 도입하여 기기간 동기화, 백업 기능 적용.
* 로컬 `localStorage` 데이터를 클라우드로 마이그레이션하는 로직 추가.

### 4.2. 서비스 품질 고도화 (P1)
* Vitest를 이용한 핵심 비즈니스 로직(타이머, 상태 관리) 자동화 회귀 테스트 구축.
* AI 백엔드 연동을 통한 실제 작업 세분화 프롬프팅 기능 구현.

### 4.3. 데스크톱 프로덕션 배포 (P2)
* Tauri 앱 노터라이즈(macOS), 코드 서명(Windows) 및 자동 업데이트 시스템 구축.

---

## 5. 실행 및 빌드

웹 개발 서버 실행:
```bash
npm install
npm run dev
```

Tauri 데스크톱 앱 빌드 (macOS/Windows):
```bash
npm run build
cd src-tauri
cargo build
```

현재 개발 서버 주소: `http://localhost:5173/`
