import { generateId } from '../utils/id.js';

export function getTodayOpenTasks(tasks, todayDate) {
  if (!tasks || !Array.isArray(tasks)) return [];
  return tasks.filter(t => t.targetDate === todayDate && t.status === 'open');
}

export function getFirstRitualCandidate(tasks, todayDate) {
  const todayTasks = getTodayOpenTasks(tasks, todayDate);
  if (todayTasks.length === 0) return null;

  // Sort by order ascending, then by createdAt (if exists) ascending
  todayTasks.sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    const aTime = a.createdAt || 0;
    const bTime = b.createdAt || 0;
    return aTime - bTime;
  });

  return todayTasks[0];
}

export function createQuickStartTask({ title, focusMinutes, breakMinutes, todayDate }) {
  return {
    id: generateId('t'),
    title: title || '이름 없는 집중',
    focusMinutes: focusMinutes || 25,
    breakMinutes: breakMinutes || 5,
    status: 'active',
    timeLabel: 'Now',
    targetDate: todayDate,
    order: -1, // prioritize quick starts
    createdAt: Date.now()
  };
}
