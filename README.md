# 🍅 Tomato — Focus Ritual Tool

> A pixel-art media-art inspired focus ritual application built with Vite, Three.js, and GSAP.  
> Not a productivity dashboard. A digital ritual stage.

![Tomato Focus Ritual](https://img.shields.io/badge/version-v5.0-FB3640?style=flat-square&labelColor=000F08)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-white?style=flat-square&labelColor=000F08)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&labelColor=000F08)

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
- 3D stage pulled back; structure becomes minimal

### `[ FOCUS ]` — Ritual Timer
- Fullscreen pixel clock with `VT323` font
- Status copy: `SIGNAL LOCKED // IN PROGRESS`
- **Tension UX**: at ≤3 minutes remaining, red glow expands and copy becomes `FINAL STRETCH // CLOSING LOOP...`
- Controls locked to 2 buttons max: `[ PAUSE ]` / `[ COMPLETE LOOP ]`

### `[ ARCHIVE ]` — Ritual Collection
- Completed sessions become collectible stamp cards
- Alternating solid Red and White cards with shape codes (`■` / `▲`)
- Empty slot: `+ AWAIT` — invites next ritual completion
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
| ARCHIVE | Monolith nearly gone (scale 0.1, position z -10), only grid horizon remains |

---

## Data Flow

Tasks are stored in `localStorage` and managed via `appState`:

```js
appState.tasks   // [ { id, title, focusMinutes, status, timeLabel } ]
appState.history // [ { ...task, completedAt } ]
appState.session // { activeTaskId, mode, remainingSeconds, isRunning }
```

Completing a session via `[ COMPLETE LOOP ]` or timer end:
1. Marks the task `status: 'done'` in `tasks`
2. Pushes a copy to `history` array
3. Renders new Archive stamp card
4. Navigates automatically to `[ ARCHIVE ]`

---

## Tech Stack

| Library | Version | Role |
|---|---|---|
| [Vite](https://vite.dev) | ^8.0 | Dev server + bundler |
| [Three.js](https://threejs.org) | ^0.183 | WebGL 3D background stage |
| [`RenderPixelatedPass`](https://threejs.org/examples/#webgl_postprocessing_pixel) | (Three.js addon) | Pixel post-processing shader |
| [GSAP](https://gsap.com) | ^3.14 | State-driven animation (transitions, tension UX) |
| [Google Fonts](https://fonts.google.com) | — | Pixelify Sans, VT323, DotGothic16 |

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

**Note**: If you see a broken UI, open DevTools → Application → Local Storage → delete `tomato_os_tasks` and `tomato_os_history` keys, then refresh. This clears any stale data from older versions.

---

## Project Philosophy

> "Each screen drives one action.  
> The background breathes, not decorates.  
> Focus is not tracked. Focus is performed."

Tomato is designed to be **used daily** — not explored once. The aesthetic serves the behavior. The behavior serves the ritual.

---

*Designed and built as a pixel-art media ritual tool.*  
*Imperial Red should appear only as a signal event, not a base fill.*
