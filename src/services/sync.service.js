import { supabase } from '../supabase/client.js';
import { getRuntimeUser, loadCloudState } from '../state.js';

let realtimeChannel = null;
let pollInterval = null;
let isRealtimeActive = false;

const POLL_MS = 5000;

export function initSyncService() {
  window.addEventListener('tomato:auth-ready', startSync);
  window.addEventListener('tomato:userchange', startSync);
  
  // Clean up on unload
  window.addEventListener('beforeunload', stopSync);
}

async function startSync() {
  stopSync(); // stop any existing sync
  
  const user = getRuntimeUser();
  if (!user) return;

  // Try to setup realtime
  setupRealtime(user.id);
  
  // Start polling fallback immediately (we will disable it if realtime connects successfully)
  startPolling();
}

function stopSync() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isRealtimeActive = false;
}

function setupRealtime(userId) {
  realtimeChannel = supabase.channel(`public:user_data:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'current_sessions', filter: `user_id=eq.${userId}` },
      handleSessionChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'focus_tasks', filter: `user_id=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'focus_history', filter: `user_id=eq.${userId}` },
      handleHistoryChange
    )
    .subscribe((status) => {
      console.log('Supabase Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        isRealtimeActive = true;
        // Optional: stop polling if we strictly want realtime-only, 
        // but keeping polling as fallback is safer if we drop connection without knowing.
        // Actually, we can reduce polling frequency if realtime is active.
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isRealtimeActive = false;
      }
    });
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    // If realtime is active, we might skip polling or poll less frequently.
    // For V12 MVP, we'll poll anyway to ensure state is absolutely correct, 
    // or we can rely solely on realtime and only poll if it drops.
    if (isRealtimeActive && !isWidget()) {
       // On Web Main, if realtime is up, maybe we don't need heavy polling. 
       // We'll skip unless it's the widget which relies heavily on exact seconds.
       // Actually, the app calculates remaining time client-side, so polling is just for catching missed updates.
    }

    const user = getRuntimeUser();
    if (!user) return;
    
    // We just call loadCloudState which re-fetches everything and updates the UI if things changed.
    // However, loadCloudState might be too heavy to do every 2 seconds.
    // So we'll implement a lightweight session fetch for polling.
    // Wait, the requirement says "polling fallback". If realtime is active, we don't poll.
    if (!isRealtimeActive) {
      await loadCloudState();
    }
  }, POLL_MS);
}

async function handleSessionChange(payload) {
  console.log('Realtime session change:', payload);
  await loadCloudState(); // Simple reaction: reload state
}

async function handleTaskChange(payload) {
  console.log('Realtime task change:', payload);
  await loadCloudState();
}

async function handleHistoryChange(payload) {
  console.log('Realtime history change:', payload);
  await loadCloudState();
}
