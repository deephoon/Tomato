# 🍅 Tomato — Focus Ritual Tool

> A pixel-art media-art inspired focus ritual application built with Vite, Three.js, and GSAP.  
> Not a productivity dashboard. A digital ritual stage.

![Tomato Focus Ritual](https://img.shields.io/badge/version-v5.0-FB3640?style=flat-square&labelColor=000F08)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-white?style=flat-square&labelColor=000F08)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&labelColor=000F08)

**[한국어 버전은 아래에 있습니다 ↓](#-tomato--포커스-리추얼-툴)**

---

## Concept

Tomato is a **Focus Ritual Tool** — not a standard Pomodoro timer.

It is built around the idea that focus is not a task to manage but a **ritual to enter**. The visual language draws from pixel-art media installations, digital sculpture, and tactical signal aesthetics.

Each session is not just a countdown. It is a **stage performance** with a beginning, a locked signal state, a tension sequence, and a ceremonial completion.

---

## Design Language

| Principle | Description |
|---|---|
| **Night × Imperial** | Deep black base (`#000F08`) with Imperial Red (`#FB3640`) as the singular reactive signal |
| **Pixel-Art Media Art** | Not retro game aesthetics — a low-resolution digital sculpture stage |
| **Behavioral UX** | Every screen drives one action. Empty states invite, not just wait |
| **Signal-Driven Motion** | Animation is slow, geometric, state-controlled — never decorative |

### Color System
| Token | Hex | Role |
|---|---|---|
| Deep Base | `#000F08` | Scene background, void |
| Stage Black | `#050505` | Monolith core, surfaces |
| Surface Black | `#0F0F0F` | Cards, panels |
| Hero Red | `#FB3640` | Signal event only — active state, armed slot, tension |
| Soft White | `#F4F1EA` | Typography, wireframe glints |

### Typography
| Font | Usage |
|---|---|
| `Pixelify Sans 700` | Section headers (`FOCUS SLOTS // TODAY`, `RITUAL ARCHIVE`) |
| `VT323` | Timer clock display — high-legibility pixel mono |
| `DotGothic16` | UI labels, microcopy, metadata |

---

## Architecture

```
/
├── index.html          — App shell with error boundary
├── src/
│   ├── main.js         — View router, render engine, all interactions
│   ├── state.js        — Single source of truth, safe localStorage persistence
│   ├── timer.js        — Date.now()-accurate Pomodoro countdown engine
│   ├── three-scene.js  — 3D pixel media art background stage (Three.js + GSAP)
│   └── style.css       — Full design system (CSS custom properties)
```

---

## 4-View System

### `[ HOME ]` — Action Stage
- Displays the single active ritual task (Hero Block)
- Shows readiness state: `1 OF 3 BLOCKS`, `READY NOW`
- One CTA: `>>> CLICK TO BEGIN RITUAL`
- 3D Monolith at full theatrical scale

### `[ PLANNER ]` — Tactical Grid
- Time-slot based scheduling interface
- Five slot states: `DONE`, `ARMED` (active), `OPEN`, `MISSED`, `EMPTY`
- Empty slot CTA: `+ DROP NEXT RITUAL` — click to add new task
- 3D stage pulled back; only structural outline remains

### `[ FOCUS ]` — Ritual Timer
- Fullscreen pixel clock with `VT323` font
- Status copy: `SIGNAL LOCKED // IN PROGRESS`
- **Tension UX**: at ≤3 minutes remaining, red glow expands and copy shifts to `FINAL STRETCH // CLOSING LOOP...`
- Controls locked to 2 buttons max: `[ PAUSE ]` / `[ COMPLETE LOOP ]`

### `[ ARCHIVE ]` — Ritual Collection
- Completed sessions become collectible stamp cards
- Alternating solid Red and White cards with shape codes (`■` / `▲`)
- Empty slot: `+ AWAIT` — invites the next ritual completion
- 3D stage fully retracted to a quiet grid horizon

---

## 3D Background Stage

The background is a **pixel-constructed media art environment** — not decorative VFX.

**Layer 1 — Horizon Grid**: A `GridHelper` lattice at low opacity that slowly tracks forward, creating digital spatial depth.

**Layer 2 — Pixel Monolith**: A low-poly `IcosahedronGeometry` with a dark solid core and a brutalist `WireframeGeometry` cage. Inner red signal mesh activates during FOCUS mode.

**Layer 3 — Symbolic Particles**: 150 grid-snapped `+` symbol particles (canvas-drawn, `NearestFilter` for pixel crispness), drifting downward like a signal rain.

### State Reactions
| Screen | Stage Behavior |
|---|---|
| HOME | Monolith centered, wireframe dim gray, slow rotation |
| FOCUS | Wireframe turns red, scale grows, red inner pulse activates |
| PLANNER | Monolith retreats back and down, wireframe near-invisible |
| ARCHIVE | Monolith nearly gone (scale 0.1), only grid horizon remains |

---

## Data Flow

```js
appState.tasks   // [ { id, title, focusMinutes, status, timeLabel } ]
appState.history // [ { ...task, completedAt } ]
appState.session // { activeTaskId, mode, remainingSeconds, isRunning }
```

Completing a session via `[ COMPLETE LOOP ]` or timer end:
1. Marks the task `status: 'done'` in `tasks`
2. Pushes a copy to `history` array with `completedAt` timestamp
3. Renders a new Archive stamp card dynamically
4. Navigates automatically to `[ ARCHIVE ]`

---

## Tech Stack

| Library | Version | Role |
|---|---|---|
| [Vite](https://vite.dev) | ^8.0 | Dev server + bundler |
| [Three.js](https://threejs.org) | ^0.183 | WebGL 3D background stage |
| `RenderPixelatedPass` | Three.js addon | Pixel post-processing shader |
| [GSAP](https://gsap.com) | ^3.14 | State-driven animation |
| Google Fonts | — | Pixelify Sans, VT323, DotGothic16 |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```

> **Troubleshooting**: If the UI appears broken, open DevTools → Application → Local Storage → delete `tomato_os_tasks` and `tomato_os_history`, then refresh. This clears stale data from older versions.

---

## Philosophy

> "Each screen drives one action.  
> The background breathes, not decorates.  
> Focus is not tracked. Focus is performed."

---
---

# 🍅 Tomato — 포커스 리추얼 툴

> Vite, Three.js, GSAP으로 만든 픽셀 미디어아트 기반의 집중 리추얼 웹 앱입니다.  
> 생산성 대시보드가 아닙니다. 디지털 제단(Ritual Stage)입니다.

![Tomato Focus Ritual](https://img.shields.io/badge/버전-v5.0-FB3640?style=flat-square&labelColor=000F08)

---

## 컨셉

Tomato는 **포커스 리추얼 툴**입니다 — 일반적인 포모도로 타이머가 아닙니다.

집중은 관리하는 것이 아니라 **입장하는 의식(Ritual)**이라는 생각을 바탕으로 만들었습니다. 비주얼 언어는 픽셀 미디어 아트 설치물, 디지털 조각, 전술적 신호 미학에서 가져왔습니다.

각 세션은 단순한 카운트다운이 아닙니다. 시작, 신호 잠금, 긴장 구간, 완료 의식으로 이어지는 **스테이지 퍼포먼스**입니다.

---

## 디자인 언어

| 원칙 | 설명 |
|---|---|
| **Night × Imperial** | 깊은 블랙 베이스(`#000F08`) 위에 임페리얼 레드(`#FB3640`)를 유일한 반응형 신호로 사용 |
| **픽셀 미디어 아트** | 레트로 게임 미학이 아닌 — 저해상도 디지털 조각 스테이지 |
| **행동 유도 UX** | 모든 화면은 하나의 행동을 이끕니다. 빈 공간도 초대합니다. |
| **신호 기반 모션** | 애니메이션은 느리고, 기하학적이며, 상태에 의해 제어됩니다. 장식이 아닙니다. |

### 컬러 시스템
| 토큰 | 헥스 | 역할 |
|---|---|---|
| Deep Base | `#000F08` | 씬 배경, 심연 |
| Stage Black | `#050505` | 모놀리스 코어, 표면 |
| Surface Black | `#0F0F0F` | 카드, 패널 |
| Hero Red | `#FB3640` | 신호 이벤트 전용 — 활성 상태, ARMED 슬롯, 긴장 구간 |
| Soft White | `#F4F1EA` | 타이포그래피, 와이어프레임 반짝임 |

### 타이포그래피
| 폰트 | 사용처 |
|---|---|
| `Pixelify Sans 700` | 섹션 헤더 (`FOCUS SLOTS // TODAY`, `RITUAL ARCHIVE`) |
| `VT323` | 타이머 시계 — 고가독성 픽셀 모노스페이스 |
| `DotGothic16` | UI 레이블, 마이크로카피, 메타데이터 |

---

## 아키텍처

```
/
├── index.html          — 앱 셸, 에러 바운더리 포함
├── src/
│   ├── main.js         — 뷰 라우터, 렌더 엔진, 모든 상호작용
│   ├── state.js        — 단일 진실 공급원, 안전한 localStorage 영속성
│   ├── timer.js        — Date.now() 기반 포모도로 카운트다운 엔진
│   ├── three-scene.js  — 3D 픽셀 미디어아트 배경 스테이지 (Three.js + GSAP)
│   └── style.css       — 전체 디자인 시스템 (CSS 커스텀 프로퍼티)
```

---

## 4가지 뷰 시스템

### `[ HOME ]` — 액션 스테이지
- 오늘의 단 하나의 활성 리추얼 태스크(히어로 블록)를 표시합니다
- 준비 상태 표시: `1 OF 3 BLOCKS`, `READY NOW`
- 단 하나의 CTA: `>>> CLICK TO BEGIN RITUAL`
- 3D 모놀리스가 연극적 풀스케일로 중앙에 위치

### `[ PLANNER ]` — 전술 그리드
- 시간 슬롯 기반 스케줄링 인터페이스
- 5가지 슬롯 상태: `DONE`, `ARMED`(활성), `OPEN`, `MISSED`, `EMPTY`
- 빈 슬롯 CTA: `+ DROP NEXT RITUAL` — 클릭하면 새 태스크 추가
- 3D 스테이지는 후퇴, 구조적 윤곽선만 남음

### `[ FOCUS ]` — 리추얼 타이머
- `VT323` 폰트로 풀스크린 픽셀 시계 표시
- 상태 카피: `SIGNAL LOCKED // IN PROGRESS`
- **텐션 UX**: 3분(180초) 이하 남으면 붉은 글로우가 폭발하고 카피가 `FINAL STRETCH // CLOSING LOOP...`로 전환
- 버튼 최대 2개로 제한: `[ PAUSE ]` / `[ COMPLETE LOOP ]`

### `[ ARCHIVE ]` — 리추얼 수집함
- 완료된 세션이 수집형 스탬프 카드로 전환됩니다
- 솔리드 레드와 화이트 카드가 교대로, 도형 코드(`■` / `▲`) 포함
- 빈 슬롯: `+ AWAIT` — 다음 리추얼 완료로의 초대
- 3D 스테이지는 완전히 후퇴, 조용한 그리드 수평선만 남음

---

## 3D 배경 스테이지

배경은 **픽셀로 구축된 미디어아트 환경**입니다 — 장식용 VFX가 아닙니다.

**레이어 1 — 수평선 그리드**: 낮은 투명도의 `GridHelper` 격자가 느리게 앞으로 이동하며 디지털 공간 깊이감을 만듭니다.

**레이어 2 — 픽셀 모놀리스**: 어두운 솔리드 코어와 브루탈리스트 `WireframeGeometry` 케이지를 가진 저폴리 `IcosahedronGeometry`. FOCUS 모드에서 내부 레드 신호 메쉬가 활성화됩니다.

**레이어 3 — 심볼릭 파티클**: 격자에 스냅된 150개의 `+` 심볼 파티클 (캔버스로 그린 후 `NearestFilter` 적용), 신호 비처럼 아래로 표류합니다.

### 상태별 스테이지 반응
| 화면 | 스테이지 동작 |
|---|---|
| HOME | 모놀리스 중앙, 와이어프레임 희미한 회색, 느린 회전 |
| FOCUS | 와이어프레임 레드 전환, 스케일 증가, 내부 레드 펄스 활성화 |
| PLANNER | 모놀리스 뒤로 후퇴, 와이어프레임 거의 투명 |
| ARCHIVE | 모놀리스 거의 사라짐 (스케일 0.1), 그리드 수평선만 남음 |

---

## 데이터 플로우

```js
appState.tasks   // [ { id, title, focusMinutes, status, timeLabel } ]
appState.history // [ { ...task, completedAt } ]
appState.session // { activeTaskId, mode, remainingSeconds, isRunning }
```

`[ COMPLETE LOOP ]` 또는 타이머 종료로 세션 완료 시:
1. `tasks`에서 해당 태스크 `status: 'done'`으로 변경
2. `completedAt` 타임스탬프와 함께 `history`에 복사본 추가
3. 새 아카이브 스탬프 카드 동적 렌더링
4. `[ ARCHIVE ]`로 자동 이동

---

## 기술 스택

| 라이브러리 | 버전 | 역할 |
|---|---|---|
| [Vite](https://vite.dev) | ^8.0 | 개발 서버 + 번들러 |
| [Three.js](https://threejs.org) | ^0.183 | WebGL 3D 배경 스테이지 |
| `RenderPixelatedPass` | Three.js 애드온 | 픽셀 포스트프로세싱 셰이더 |
| [GSAP](https://gsap.com) | ^3.14 | 상태 기반 애니메이션 |
| Google Fonts | — | Pixelify Sans, VT323, DotGothic16 |

---

## 개발 시작

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build
```

> **문제 해결**: UI가 깨져보이면, 개발자 도구 → Application → Local Storage에서 `tomato_os_tasks`와 `tomato_os_history` 키를 삭제 후 새로고침 하세요. 구버전 데이터가 남아있을 수 있습니다.

---

## 프로젝트 철학

> "각 화면은 하나의 행동을 이끕니다.  
> 배경은 숨쉬되, 장식하지 않습니다.  
> 집중은 기록되지 않습니다. 집중은 수행됩니다."

---

*임페리얼 레드는 신호 이벤트로만 써야 합니다. 기본 채움(Base fill)으로 사용하지 마세요.*
