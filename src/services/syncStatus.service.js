// ==========================================
// SYNC STATUS — make remote-write failures visible.
//
// The primary writes (tasks/history/session) used to be fire-and-forget with a
// bare `.catch(console.error)`: when a save failed (offline, network, RLS) the
// user saw nothing and silently lost data. This service tracks every wrapped
// write + the online/offline state and emits a single derived status that the
// meta bar renders (OFFLINE / SYNCING / SAVE FAILED / SYNCED).
// ==========================================

let online = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
  ? navigator.onLine
  : true;
let inflight = 0;
let failed = false;

// Pure decision: given the raw signals, what status should the UI show?
// Priority: offline > failed > syncing > synced.
export function deriveSyncStatus({ online: isOnline, inflight: pending, failed: hasFailed } = {}) {
  if (!isOnline) return { key: 'syncOffline', tone: 'offline', actionable: false };
  if (hasFailed) return { key: 'syncFailed', tone: 'error', actionable: true };
  if ((pending || 0) > 0) return { key: 'syncSyncing', tone: 'syncing', actionable: false };
  return { key: 'syncSynced', tone: 'ok', actionable: false };
}

export function getSyncStatus() {
  return deriveSyncStatus({ online, inflight, failed });
}

function emit() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tomato:sync-status', { detail: getSyncStatus() }));
}

// Wrap a repository write promise. Resolving to `false` (repo-level failure) or
// rejecting both count as a failure; any success clears the failed flag.
export function trackWrite(result) {
  inflight += 1;
  emit();
  return Promise.resolve(result)
    .then((value) => {
      failed = value === false;
      return value;
    })
    .catch((err) => {
      failed = true;
      console.error('Sync write failed:', err);
      return false;
    })
    .finally(() => {
      inflight = Math.max(0, inflight - 1);
      emit();
    });
}

// Called by the UI retry affordance; the caller re-issues the writes.
export function clearSyncFailure() {
  failed = false;
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online = true; failed = false; emit(); });
  window.addEventListener('offline', () => { online = false; emit(); });
}
