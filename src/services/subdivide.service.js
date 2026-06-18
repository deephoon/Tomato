// ==========================================
// LOCAL TASK SUBDIVISION (heuristic, no network)
// Splits a focus task into meaningful phases based on its title and total time.
// Deterministic: same title + duration always yields the same blocks.
// ==========================================

// Phase templates per inferred task type (6 phases each so we can support up
// to 6 blocks; fewer blocks pick an evenly-spread subset incl. first & last).
const TEMPLATES = {
  writing: ['OUTLINE', 'DRAFT', 'EXPAND', 'REVISE', 'EDIT', 'POLISH'],
  study:   ['PREVIEW', 'READ', 'NOTE', 'PRACTICE', 'REVIEW', 'RECALL'],
  dev:     ['DESIGN', 'SCAFFOLD', 'IMPLEMENT', 'TEST', 'DEBUG', 'REFACTOR'],
  design:  ['RESEARCH', 'SKETCH', 'EXPLORE', 'COMPOSE', 'REFINE', 'HANDOFF'],
  meeting: ['PREP', 'AGENDA', 'DISCUSS', 'DECIDE', 'ASSIGN', 'RECAP'],
  default: ['WARM-UP', 'FOCUS', 'BUILD', 'PUSH', 'REVIEW', 'WRAP-UP']
};

const KEYWORDS = {
  writing: ['write', 'writing', 'essay', 'report', 'blog', 'article', 'draft', 'doc', 'paper',
            '글', '작성', '글쓰기', '보고서', '문서', '에세이', '블로그', '원고', '리포트'],
  study:   ['study', 'learn', 'learning', 'read', 'reading', 'course', 'lecture', 'exam', 'review',
            '공부', '학습', '독서', '강의', '시험', '복습', '읽기', '암기'],
  dev:     ['code', 'coding', 'dev', 'develop', 'build', 'implement', 'bug', 'debug', 'refactor',
            'api', 'feature', 'deploy', '개발', '코딩', '구현', '버그', '디버그', '리팩', '기능', '배포'],
  design:  ['design', 'ui', 'ux', 'wireframe', 'mockup', 'prototype', 'figma', 'layout',
            '디자인', '시안', '와이어', '목업', '프로토', '레이아웃'],
  meeting: ['meeting', 'meet', 'call', 'sync', 'plan', 'planning', 'standup', 'interview',
            '회의', '미팅', '콜', '동기화', '기획', '계획', '인터뷰', '면접']
};

// Infer task type from the title via keyword match. Returns a TEMPLATES key.
export function inferTaskType(title) {
  const text = String(title || '').toLowerCase();
  for (const type of ['dev', 'design', 'study', 'writing', 'meeting']) {
    if (KEYWORDS[type].some((kw) => text.includes(kw))) return type;
  }
  return 'default';
}

// How many blocks to split into, given total minutes.
function blockCount(total) {
  if (total <= 30) return 2;
  if (total <= 50) return 2;
  return Math.min(6, Math.max(3, Math.ceil(total / 25)));
}

// Split total minutes into `count` durations (each ≥ 10, multiples of 5 where
// possible). The durations always sum exactly to `total`.
export function splitDurations(total, count) {
  const durs = [];
  let remaining = total;
  for (let i = 0; i < count; i++) {
    const slotsLeft = count - i;
    let d;
    if (slotsLeft === 1) {
      d = remaining;
    } else {
      d = Math.round((remaining / slotsLeft) / 5) * 5;
      // Leave at least 10 min for every remaining slot.
      d = Math.min(d, remaining - 10 * (slotsLeft - 1));
      d = Math.max(10, d);
    }
    durs.push(d);
    remaining -= d;
  }
  return durs;
}

// Pick `count` phase names from a template, evenly spread and always including
// the first and last phase so the arc reads start → finish.
function pickPhases(template, count) {
  if (count <= 1) return [template[0]];
  if (count >= template.length) {
    return Array.from({ length: count }, (_, i) => template[i] || `BLOCK ${i + 1}`);
  }
  const names = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (template.length - 1)) / (count - 1));
    names.push(template[idx]);
  }
  return names;
}

// Main entry: produce labelled focus blocks for a task.
// Returns [{ title, phase, dur }] where title = "<task> · <PHASE>".
export function generateSubdivisionBlocks(title, total) {
  const clean = String(title || '').trim() || 'FOCUS';
  const minutes = Math.max(10, Math.round(Number(total) || 25));
  const type = inferTaskType(clean);
  const count = blockCount(minutes);
  const durs = splitDurations(minutes, count);
  const phases = pickPhases(TEMPLATES[type], count);
  return durs.map((dur, i) => ({
    title: `${clean} · ${phases[i]}`,
    phase: phases[i],
    dur
  }));
}
