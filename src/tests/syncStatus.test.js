import { describe, expect, it } from 'vitest';
import { deriveSyncStatus } from '../services/syncStatus.service.js';

describe('deriveSyncStatus', () => {
  it('offline takes priority over everything', () => {
    expect(deriveSyncStatus({ online: false, inflight: 2, failed: true }))
      .toMatchObject({ key: 'syncOffline', tone: 'offline' });
  });

  it('shows SAVE FAILED when online and a write failed', () => {
    const s = deriveSyncStatus({ online: true, inflight: 0, failed: true });
    expect(s).toMatchObject({ key: 'syncFailed', tone: 'error', actionable: true });
  });

  it('failure outranks in-flight writes', () => {
    expect(deriveSyncStatus({ online: true, inflight: 1, failed: true }).key).toBe('syncFailed');
  });

  it('shows SYNCING while writes are in flight', () => {
    expect(deriveSyncStatus({ online: true, inflight: 1, failed: false }))
      .toMatchObject({ key: 'syncSyncing', tone: 'syncing' });
  });

  it('shows SYNCED when online, idle and no failure', () => {
    expect(deriveSyncStatus({ online: true, inflight: 0, failed: false }))
      .toMatchObject({ key: 'syncSynced', tone: 'ok' });
  });

  it('only the failed state is actionable (retry)', () => {
    expect(deriveSyncStatus({ online: false, inflight: 0, failed: false }).actionable).toBe(false);
    expect(deriveSyncStatus({ online: true, inflight: 0, failed: false }).actionable).toBe(false);
    expect(deriveSyncStatus({ online: true, inflight: 0, failed: true }).actionable).toBe(true);
  });
});
