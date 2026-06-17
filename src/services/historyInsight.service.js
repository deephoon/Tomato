// ==========================================
// ARCHIVE INSIGHT SERVICE
// ==========================================

export function getTotalFocusMinutes(history) {
  if (!history || history.length === 0) return 0;
  return history.reduce((acc, h) => acc + (h.actualSeconds ? Math.floor(h.actualSeconds / 60) : h.focusMinutes), 0);
}

export function getTodaySessionCount(history, todayDate) {
  if (!history || history.length === 0) return 0;
  return history.filter(h => h.date === todayDate).length;
}

export function getLast7DaysFocusMinutes(history, todayDate) {
  if (!history || history.length === 0) return 0;
  
  const today = new Date(todayDate);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const recentHistory = history.filter(h => {
    const d = new Date(h.date);
    return d >= sevenDaysAgo && d <= today;
  });
  
  return getTotalFocusMinutes(recentHistory);
}

export function getAverageSessionMinutes(history) {
  if (!history || history.length === 0) return 0;
  const totalMinutes = getTotalFocusMinutes(history);
  return Math.round(totalMinutes / history.length);
}

export function getBestFocusDay(history) {
  if (!history || history.length === 0) return null;
  
  const minutesByDate = history.reduce((acc, h) => {
    acc[h.date] = (acc[h.date] || 0) + (h.actualSeconds ? Math.floor(h.actualSeconds / 60) : h.focusMinutes);
    return acc;
  }, {});
  
  let bestDay = null;
  let maxMinutes = 0;
  
  Object.keys(minutesByDate).forEach(date => {
    if (minutesByDate[date] > maxMinutes) {
      maxMinutes = minutesByDate[date];
      bestDay = date;
    }
  });
  
  return { date: bestDay, minutes: maxMinutes };
}

export function getReflectionStats(history) {
  const stats = { easy: 0, normal: 0, hard: 0, null: 0, total: history ? history.length : 0 };
  if (!history || history.length === 0) return stats;
  
  history.forEach(h => {
    if (h.reflection === 'easy') stats.easy++;
    else if (h.reflection === 'normal') stats.normal++;
    else if (h.reflection === 'hard') stats.hard++;
    else stats.null++;
  });
  
  return stats;
}

export function getLeastInterruptedSession(history) {
  if (!history || history.length === 0) return null;
  
  let leastInterrupted = null;
  let minPauses = Infinity;
  
  history.forEach(h => {
    const pauses = h.pauseCount || 0;
    if (pauses < minPauses) {
      minPauses = pauses;
      leastInterrupted = h;
    }
  });
  
  return leastInterrupted;
}

export function getLongestFocusSession(history) {
  if (!history || history.length === 0) return null;
  
  let longest = null;
  let maxSeconds = 0;
  
  history.forEach(h => {
    const seconds = h.actualSeconds || (h.focusMinutes * 60);
    if (seconds > maxSeconds) {
      maxSeconds = seconds;
      longest = h;
    }
  });
  
  return longest;
}

export function getCurrentStreak(history, todayDate) {
  if (!history || history.length === 0) return 0;
  
  const dates = [...new Set(history.map(h => h.date))].sort().reverse();
  if (dates.length === 0) return 0;
  
  const today = new Date(todayDate);
  const latestDate = new Date(dates[0]);
  
  // If the latest record is older than yesterday, streak is broken
  const diffTime = Math.abs(today - latestDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1 && dates[0] !== todayDate) return 0;
  
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const d1 = new Date(dates[i]);
    const d2 = new Date(dates[i+1]);
    const diff = Math.ceil(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

export function getRecentSessions(history, limit = 5) {
  if (!history || history.length === 0) return [];
  // Sort by completedAt descending
  const sorted = [...history].sort((a, b) => b.completedAt - a.completedAt);
  return sorted.slice(0, limit);
}
