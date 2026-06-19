// ==========================================
// ARCHIVE QUERY — pure filter / search / sort / group pipeline
// Single source of truth for what the 기록(Archive) gallery shows.
// Kept side-effect free so it is unit-testable; main.js owns the DOM.
// ==========================================

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function actualSecondsOf(h) {
  return h.actualSeconds != null ? h.actualSeconds : (h.focusMinutes || 25) * 60;
}

// Dates belonging to the active streak (consecutive days ending today or yesterday).
export function getStreakDates(history, todayDate) {
  const datesWith = new Set((history || []).map(h => h.date));
  const out = new Set();
  let d = parseDate(todayDate || fmtDate(new Date()));
  if (!datesWith.has(fmtDate(d))) {
    d.setDate(d.getDate() - 1);
    if (!datesWith.has(fmtDate(d))) return out;
  }
  while (datesWith.has(fmtDate(d))) {
    out.add(fmtDate(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

// filter: 'all' | '25' | '50' | 'streak'
export function filterByType(history, filter, todayDate) {
  const list = history || [];
  switch (filter) {
    case '25':
      return list.filter(h => (h.focusMinutes || 25) <= 25);
    case '50':
      return list.filter(h => (h.focusMinutes || 25) >= 50);
    case 'streak': {
      const streakDates = getStreakDates(list, todayDate);
      return list.filter(h => streakDates.has(h.date));
    }
    case 'all':
    default:
      return list.slice();
  }
}

// Free-text match across title + reflection.
export function searchHistory(history, query) {
  const q = (query || '').trim().toLowerCase();
  const list = history || [];
  if (!q) return list.slice();
  return list.filter(h =>
    (h.title || '').toLowerCase().includes(q) ||
    (h.reflection || '').toLowerCase().includes(q)
  );
}

// sort: 'newest' | 'oldest' | 'longest'
export function sortHistory(list, sort) {
  const arr = (list || []).slice();
  switch (sort) {
    case 'oldest':
      return arr.sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
    case 'longest':
      return arr.sort((a, b) => actualSecondsOf(b) - actualSecondsOf(a));
    case 'newest':
    default:
      return arr.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
}

// Full pipeline -> [{ date, items, totalMin, count }] ready for rendering.
export function queryArchive(history, { filter = 'all', search = '', sort = 'newest', today } = {}) {
  let list = filterByType(history || [], filter, today);
  list = searchHistory(list, search);

  const groups = {};
  list.forEach(h => {
    const date = h.date || 'UNKNOWN';
    if (!groups[date]) groups[date] = [];
    groups[date].push(h);
  });

  const dateOrder = Object.keys(groups).sort((a, b) =>
    sort === 'oldest' ? a.localeCompare(b) : b.localeCompare(a)
  );

  return dateOrder.map(date => {
    const items = sortHistory(groups[date], sort);
    return {
      date,
      items,
      count: items.length,
      totalMin: items.reduce((s, h) => s + (h.focusMinutes || 0), 0)
    };
  });
}
