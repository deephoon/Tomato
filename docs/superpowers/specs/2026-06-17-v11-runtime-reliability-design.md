# Tomato V11 — Runtime Reliability & Feature Wiring (Design)

Date: 2026-06-17

## Problem

The V11 refactor introduced a clean, unit-tested timing engine (`timer.js`) and four
domain services, but `main.js` was only half-migrated. The app builds and 35 tests
pass, yet at runtime:

1. **BEGIN crashes** — `startTaskRitual` (main.js:1072) and `enterBreakMode`
   (main.js:1893) call `switchMode`, which does not exist. A focus session never
   starts; the break cycle never advances. Confirmed via headless-Chrome smoke test
   (`ReferenceError: switchMode is not defined`, session stays `idle`).
2. **Double history logging** — `timer.js#completeFocus` and
   `main.js#completeFocusSession` both push history records, using different
   `completionKey` formats (`t_1_<now>_<dur>` vs `t_1:<endTime>`), so dedup misses
   and a naturally-expired session is logged twice.
3. **Advertised-but-unwired features** — `exportImport.service` (no UI at all),
   `historyInsight.service` (Archive duplicates the math inline, less accurately),
   `widgetSync.service` (never invoked).
4. Minor polish: `favicon.ico` 404.

## Decision

**`timer.js` is the single timing + history-logging engine. `main.js` becomes UI
orchestration only.** The engine is covered by 35 passing tests, so it is the source
of truth.

### Timer integration changes (`main.js`)

| Site | Before | After |
| --- | --- | --- |
| `startTaskRitual(task)` | `switchMode('focus'); resumeSession()` | `startFocus(task)` |
| `enterBreakMode()` | `switchMode('break'); resumeSession()` | `startBreak()` |
| Manual complete button | `resetSession(); completeFocusSession('manual_complete')` | `completeFocus()` then UI transition |
| Natural focus expiry | `tomato:timerend` → `completeFocusSession` (re-logs) | `tomato:timerend` → UI transition + notification only; **no re-log** |
| Break expiry | `timer.js tick` silently `resetSession()` | `timer.js tick` dispatches a break-end event → `main.js#endBreak` picks next task |

`main.js#completeFocusSession` is removed (its logging now lives in
`timer.js#completeFocus`). `timer.js#tick` gains a `tomato:timerend` dispatch for the
break branch carrying `{ mode: 'break' }` so `main.js` can run `endBreak()` after the
engine resets. This is additive to `timer.js` and does not change any asserted test
behavior.

### Feature wiring

- **Export / Import** — add `[ BACKUP ] / [ RESTORE ]` controls to the Archive view,
  wired to `exportImport.service`. Restore uses a hidden file `<input>`; a user-id
  mismatch triggers a confirm before overwrite. Visual tone matches the existing
  Night × Imperial Media-Art aesthetic (no aesthetic changes).
- **historyInsight** — replace Archive's inline stat math with the tested service
  (`getTotalFocusMinutes`, `getCurrentStreak`, `getLongestFocusSession`,
  `getLeastInterruptedSession`, `getBestFocusDay`) for `actualSeconds`-accurate stats.
- **widgetSync** — call `syncWidgetState()` on session start/stop so the desktop
  widget auto shows/hides.
- favicon: add a 🍅 data-URI/icon so the 404 disappears.

## Verification

After each change: `npm run test` (no regression from 35/35) plus a headless-Chrome
smoke test driving the real flow: sign-up → start focus → timer ticks → complete →
break → export → import. Success = focus view shows, `session.isRunning`/`mode`
transition correctly, exactly one history record per completion, zero uncaught
console errors.

## Out of scope

No visual redesign. No backend/sync protocol changes. No new dependencies.
