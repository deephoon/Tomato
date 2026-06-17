// Tomato v2 — shippable app
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ————————— Data —————————
const INITIAL_TODOS = [
  { id: 't1', text: 'Deep system design — architecture pass', est: 3, done: 1, tag: 'F_01', priority: 'hero' },
  { id: 't2', text: '발표 구조 정리', est: 1, done: 0, tag: 'F_02', priority: 'high' },
  { id: 't3', text: '슬라이드 초안', est: 2, done: 0, tag: 'F_03', priority: 'med' },
  { id: 't4', text: '역할 정리', est: 1, done: 0, tag: 'F_04', priority: 'med' },
  { id: 't5', text: '최종 점검', est: 1, done: 0, tag: 'F_05', priority: 'low' },
  { id: 't6', text: 'Inbox triage + standup notes', est: 1, done: 1, tag: 'F_06', priority: 'low' },
  { id: 't7', text: 'Planner flow critique', est: 1, done: 1, tag: 'F_07', priority: 'med' },
];

const INITIAL_BLOCKS = [
  { hour: 9,  time: '09:00', label: 'SYNC — standup + inbox', status: 'done', dur: '25m', tag: 'DONE' },
  { hour: 10, time: '10:00', label: 'CODE — API contract', status: 'done', dur: '50m', tag: 'DONE' },
  { hour: 14, time: '14:00', label: 'ARCHITECTURE READ', status: 'done', dur: '50m', tag: 'DONE' },
  { hour: 21, time: '21:00', label: '발표 구조 정리', status: 'planned', dur: '25m', tag: 'PLANNED' },
  { hour: 22, time: '22:00', label: 'DEEP SYSTEM DESIGN', status: 'active', dur: '25m', tag: 'ACTIVE' },
  { hour: 23, time: '23:00', label: 'EMPTY SIGNAL', status: 'empty', dur: '—', tag: 'OPEN' },
  { hour: 0,  time: '00:00', label: 'EMPTY SIGNAL', status: 'empty', dur: '—', tag: 'OPEN' },
];

const ARCHIVE = [
  { id: 'R-024', title: 'DEEP SYSTEM DESIGN', date: '2026.04.20', time: '22:00', duration: '25 MIN', task: 'System architecture refinement', seq: '3rd ritual tonight', sym: '■', color: 'red', note: 'Signal remained stable through completion.' },
  { id: 'R-023', title: 'CODE', date: '2026.04.20', time: '10:00', duration: '50 MIN', task: 'API contract wiring', seq: '2nd ritual', sym: '▲', color: 'white', note: 'Steady throughput. Minor drift at minute 32.' },
  { id: 'R-022', title: 'SYNC', date: '2026.04.20', time: '09:00', duration: '25 MIN', task: 'Morning standup + inbox triage', seq: '1st ritual', sym: '●', color: 'dark', note: 'Quick loop. Low resistance.' },
  { id: 'R-021', title: 'NIGHT WRITING', date: '2026.04.19', time: '23:30', duration: '50 MIN', task: 'Spec draft — Tomato v1', seq: '4th ritual', sym: '◆', color: 'red', note: 'Deep cadence. Ended with clear next-step.' },
  { id: 'R-020', title: 'REVIEW', date: '2026.04.19', time: '21:00', duration: '25 MIN', task: 'Planner flow critique', seq: '3rd ritual', sym: '▼', color: 'dark', note: 'Signal clean. No interrupts.' },
  { id: 'R-019', title: 'SKETCH', date: '2026.04.19', time: '15:00', duration: '25 MIN', task: 'Archive card geometry', seq: '2nd ritual', sym: '◐', color: 'white', note: 'Light session. Rotated 3 variants.' },
  { id: 'R-018', title: 'RESEARCH', date: '2026.04.19', time: '10:00', duration: '50 MIN', task: 'Pixel HUD references', seq: '1st ritual', sym: '□', color: 'dark', note: 'Collected 12 references. Filed under moodboard/03.' },
  { id: 'R-017', title: 'DESIGN SYNC', date: '2026.04.18', time: '19:00', duration: '25 MIN', task: 'Color system finalize', seq: '5th ritual', sym: '◆', color: 'red', note: 'Locked hero red at #FB3640.' },
];

const FOCUS = { title: 'DEEP SYSTEM DESIGN', est: 25, queued: 3, tag: 'F_01' };
const NAV = [
  { k: 'HOME', label: 'HOME', ico: '◈', kbd: '1' },
  { k: 'PLANNER', label: 'PLANNER', ico: '▦', kbd: '2' },
  { k: 'ARCHIVE', label: 'ARCHIVE', ico: '◧', kbd: '3' },
];

// ————————— Polygon outline —————————
function PolyOutline({ rotate = -6, color = 'rgba(244,241,234,0.22)', nodeColor = 'rgba(244,241,234,0.78)' }) {
  const pts = [
    [0.18, 0.12], [0.86, 0.06], [0.96, 0.68],
    [0.72, 0.96], [0.14, 0.88], [0.04, 0.42]
  ];
  return (
    <svg className="poly" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ transform: `rotate(${rotate}deg)` }}>
      <polygon
        points={pts.map(([x,y]) => `${x*100},${y*100}`).join(' ')}
        fill="none" stroke={color} strokeWidth="0.15" vectorEffect="non-scaling-stroke" shapeRendering="crispEdges"
      />
      {pts.map(([x,y], i) => (
        <rect key={i} x={x*100 - 0.6} y={y*100 - 0.6} width="1.2" height="1.2" fill={nodeColor} shapeRendering="crispEdges"/>
      ))}
    </svg>
  );
}

// ————————— Sidebar —————————
function Sidebar({ screen, setScreen, running, paused, remaining, total, onResume, onPause, onStart }) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = 1 - remaining / total;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark" />
        <div className="name">TOMATO</div>
        <div className="ver">v1.0</div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Navigate</div>
        {NAV.map(n => (
          <div key={n.k} className={`nav-item ${screen === n.k ? 'active' : ''}`} onClick={() => setScreen(n.k)}>
            <span className="ico">{n.ico}</span>
            <span className="label-text">{n.label}</span>
            <span className="kbd">⌘{n.kbd}</span>
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Today</div>
        <div className="nav-item">
          <span className="ico">◎</span>
          <span className="label-text">FOCUS QUEUE</span>
          <span className="count">3</span>
        </div>
        <div className="nav-item">
          <span className="ico">✓</span>
          <span className="label-text">COMPLETED</span>
          <span className="count">03</span>
        </div>
        <div className="nav-item">
          <span className="ico">◉</span>
          <span className="label-text">STREAK</span>
          <span className="count">6D</span>
        </div>
      </div>

      <div className="spacer" />

      <div className={`mini-session ${running && !paused ? 'live' : ''}`}>
        <div className="ms-label">
          <span className="dot" />
          <span>{running && !paused ? 'SIGNAL LIVE' : 'SIGNAL LOCKED'}</span>
        </div>
        <div className="ms-clock">{mm}:{ss}</div>
        <div className="ms-title">{FOCUS.title}</div>
        <div className="ms-bar"><div className="fill" style={{ width: `${pct * 100}%` }} /></div>
        <div className="ms-ctrls">
          {running && !paused
            ? <button className="mini-btn" onClick={onPause}>[ PAUSE ]</button>
            : <button className="mini-btn pri" onClick={running ? onResume : onStart}>[ {running ? 'RESUME' : 'BEGIN'} ]</button>}
          <button className="mini-btn" onClick={onStart}>[ STAGE ]</button>
        </div>
      </div>

      <div className="user-strip">
        <div className="avatar">JH</div>
        <div>
          <div className="uname">Jinhee</div>
          <div className="umeta">PRO · SYNCED</div>
        </div>
        <button className="settings" title="Settings">⚙</button>
      </div>
    </aside>
  );
}

// ————————— Page header —————————
function PageHead({ screen, onPalette, tab, setTab, now }) {
  const tabs = {
    HOME: null,
    PLANNER: ['TODAY', 'WEEK', 'BACKLOG'],
    ARCHIVE: ['ALL', 'TODAY', 'WEEK', 'MONTH'],
  };
  return (
    <header className="page-head">
      <div className="ph-left">
        <div className="ph-crumb">
          <span className="dim">TOMATO</span>
          <span className="sep">/</span>
          <span>{screen}</span>
        </div>
        {tabs[screen] && (
          <div className="ph-tabs">
            {tabs[screen].map(t => (
              <button key={t} className={`ph-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        )}
      </div>
      <div className="ph-right">
        <div className="meta">NOW<b>{now}</b></div>
        <button className="cmd-palette" onClick={onPalette}>
          <span>Command</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>
    </header>
  );
}

// ————————— Home —————————
function Home({ running, paused, remaining, onBegin, onResume, clockStyle, blocks, onOpenRitual }) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const streak = [1,1,1,1,0,1,1,1,1,1,1,1,0.5,0];
  return (
    <div className="home-grid">
      <section className="hero-card">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
        <div className="hero-head">
          <div className="hh-label"><span className="dot" />{running && !paused ? 'SIGNAL LIVE' : 'SIGNAL LOCKED'} · TONIGHT</div>
          <div className="hh-id">#{FOCUS.tag}</div>
        </div>

        <div className="hero-clock-wrap">
          <PolyOutline />
          <div className="hero-clock">
            <div className={`big-clock ${clockStyle}`}>
              {mm}<span className="col">:</span>{ss}
            </div>
            <div className="sl">{running && !paused ? 'FOCUS IN PROGRESS' : 'AWAITING SIGNAL'}</div>
          </div>
        </div>

        <div className="hero-task">
          <div className="ht-left">
            <div className="ht-kicker">TONIGHT'S MAIN FOCUS</div>
            <div className="ht-title">{FOCUS.title}</div>
            <div className="ht-meta">{FOCUS.est} MIN RITUAL · {FOCUS.queued} BLOCKS QUEUED</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.24em', color: 'var(--dim-white)' }}>NEXT</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted-white)' }}>23:00</div>
          </div>
        </div>

        <div className="hero-cta">
          <button className="big-cta" onClick={running ? onResume : onBegin}>[ {running ? 'RESUME SIGNAL' : 'BEGIN RITUAL'} ]</button>
          <button className="aux-cta" onClick={onBegin}>[ ENTER STAGE ]</button>
        </div>
      </section>

      <aside className="right-col">
        <div className="panel">
          <div className="phd">
            <h3>FOCUS SLOTS // TODAY</h3>
            <span className="sub">{blocks.filter(b => b.status === 'done').length} / {blocks.length}</span>
          </div>
          <div className="today-list">
            {blocks.map((b, i) => (
              <div key={i} className={`today-row ${b.status}`}>
                <span className="time">{b.time}</span>
                <span className="glyph" />
                <span className="label">{b.label}</span>
                <span className="tag">{b.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="phd">
            <h3>SIGNAL STATS</h3>
            <span className="sub">LAST 14 DAYS</span>
          </div>
          <div className="stat-grid">
            <div className="stat accent">
              <span className="sk">STREAK</span>
              <span className="sv">06</span>
              <span className="ss">DAYS ACTIVE</span>
            </div>
            <div className="stat">
              <span className="sk">TODAY</span>
              <span className="sv">03</span>
              <span className="ss">1H 40M FOCUSED</span>
            </div>
            <div className="stat">
              <span className="sk">RITUALS</span>
              <span className="sv">24</span>
              <span className="ss">ARCHIVED</span>
            </div>
            <div className="stat">
              <span className="sk">AVG / DAY</span>
              <span className="sv">04</span>
              <span className="ss">BLOCKS</span>
            </div>
          </div>
          <div className="streak-dots" aria-label="14-day streak">
            {streak.map((v, i) => (
              <span key={i} className={v === 1 ? 'lit' : v === 0.5 ? 'half' : ''} />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="phd">
            <h3>RECENT RITUALS</h3>
            <span className="sub">ARCHIVE</span>
          </div>
          <div className="recent-strip">
            {ARCHIVE.slice(0, 6).map(r => (
              <div key={r.id} className={`mini-ritual ${r.color}`} onClick={() => onOpenRitual(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="id">{r.id}</span>
                </div>
                <span className="sym">{r.sym}</span>
                <div>
                  <div className="t">{r.title}</div>
                  <div className="d">{r.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ————————— Planner —————————
function Planner({ blocks, setBlocks, todos, setTodos, onStart }) {
  const [tab, setTab] = useState('AI');
  const [aiInput, setAiInput] = useState('내일 발표 준비');
  const [thinking, setThinking] = useState(false);
  const [aiOut, setAiOut] = useState([
    { time: '21:00', task: '발표 구조 정리', dur: '25 MIN' },
    { time: '21:30', task: '슬라이드 초안', dur: '50 MIN' },
    { time: '22:30', task: '역할 정리', dur: '25 MIN' },
    { time: '23:00', task: '최종 점검', dur: '25 MIN' },
  ]);
  const [newTodo, setNewTodo] = useState('');

  // Hours 9..23, 0
  const hours = [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0];
  const blocksByHour = useMemo(() => {
    const m = {};
    blocks.forEach(b => { (m[b.hour] = m[b.hour] || []).push(b); });
    return m;
  }, [blocks]);

  // Current "now" line — fake at 20:40 for demo
  const nowHour = 20;
  const nowMin = 40;
  const nowRow = hours.indexOf(nowHour);

  function regen() {
    setThinking(true);
    setAiOut([]);
    const alt = [
      { time: '21:00', task: '리서치 수집', dur: '25 MIN' },
      { time: '21:30', task: '아웃라인 작성', dur: '50 MIN' },
      { time: '22:30', task: '슬라이드 섹션 1', dur: '50 MIN' },
      { time: '23:30', task: '리허설 1회', dur: '25 MIN' },
    ];
    alt.forEach((it, i) => setTimeout(() => setAiOut(p => [...p, it]), 140 + i*180));
    setTimeout(() => setThinking(false), 140 + alt.length*180 + 80);
  }
  function apply() {
    const next = blocks.map(b => {
      const hit = aiOut.find(o => o.time === b.time);
      if (hit && b.status !== 'done') return { ...b, label: hit.task.toUpperCase(), status: b.status === 'active' ? 'active' : 'planned', dur: hit.dur.replace(' MIN','m'), tag: 'PLANNED' };
      return b;
    });
    setBlocks(next);
  }
  function addTodo() {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: 't'+Date.now(), text: newTodo, est: 1, done: 0, tag: 'F_' + String(todos.length+1).padStart(2,'0'), priority: 'med' }]);
    setNewTodo('');
  }

  return (
    <div className="planner">
      <section className="cal-wrap">
        <div className="cal-head">
          <div>
            <h3>FOCUS SLOTS</h3>
          </div>
          <div className="cal-date">2026.04.20 · MON · DAY 06</div>
          <div className="cal-nav">
            <button>◄</button>
            <button>TODAY</button>
            <button>►</button>
          </div>
        </div>
        <div className="cal-body">
          {hours.map((h, i) => {
            const hourBlocks = blocksByHour[h] || [];
            const label = String(h).padStart(2,'0') + ':00';
            return (
              <div className="hour-row" key={h} style={{ position: 'relative' }}>
                {i === nowRow && (
                  <div className="now-line" style={{ top: `${6 + (nowMin/60) * 58}px` }} />
                )}
                <span className="hr-time">{label}</span>
                <div className="hr-slots">
                  {hourBlocks.length === 0 ? (
                    <div className="block empty">
                      <span className="b-label">+ ADD FOCUS BLOCK</span>
                      <span className="b-tag">OPEN</span>
                    </div>
                  ) : hourBlocks.map((b, j) => (
                    <div key={j} className={`block ${b.status}`} onClick={() => b.status === 'active' && onStart()}>
                      <div>
                        <div className="b-label">{b.label}</div>
                        <div className="b-tag">{b.tag}</div>
                      </div>
                      <div className="b-dur">{b.dur}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="side-wrap">
        <div className="side-tabs">
          <button className={`side-tab ${tab === 'AI' ? 'active' : ''}`} onClick={() => setTab('AI')}>[ AI PLAN ]</button>
          <button className={`side-tab ${tab === 'TODO' ? 'active' : ''}`} onClick={() => setTab('TODO')}>[ QUEUE ]</button>
          <button className={`side-tab ${tab === 'DONE' ? 'active' : ''}`} onClick={() => setTab('DONE')}>[ COMPLETED ]</button>
        </div>
        <div className="side-body">
          {tab === 'AI' && (
            <>
              <div className="ai-form">
                <div className="ai-form-label">SIGNAL INPUT · 해야 할 일이 무엇입니까?</div>
                <input className="ai-input" value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="e.g. 내일 발표 준비" />
                <div className="ai-quick">
                  <button className="ai-chip" onClick={() => setAiInput('내일 발표 준비')}>발표 준비</button>
                  <button className="ai-chip" onClick={() => setAiInput('다음 스프린트 설계')}>스프린트 설계</button>
                  <button className="ai-chip" onClick={() => setAiInput('논문 리뷰')}>논문 리뷰</button>
                  <button className="ai-chip" onClick={() => setAiInput('디자인 핸드오프')}>디자인 핸드오프</button>
                </div>
                <div className="ai-output-list">
                  {aiOut.map((it, i) => (
                    <div className="ai-out-item" key={i}>
                      <span className="t">{it.time}</span>
                      <span>{it.task}</span>
                      <span className="d">{it.dur}</span>
                    </div>
                  ))}
                  {thinking && <div className="ai-out-item" style={{ color: 'var(--hero-red)', borderStyle: 'dashed' }}>
                    <span>···</span>
                    <span>SIGNAL PARSING...</span>
                    <span>···</span>
                  </div>}
                </div>
                <div className="ai-actions">
                  <button className="btn-primary" onClick={apply}>[ APPLY PLAN ]</button>
                  <button className="btn-ghost" onClick={regen}>[ REGENERATE ]</button>
                  <button className="btn-terminal">[ EDIT ]</button>
                </div>
              </div>

              <div className="todo-group-label">
                <span>OPEN QUEUE</span>
                <span>{todos.filter(t=>!t.done).length} TASKS</span>
              </div>
              <div className="todo-list">
                {todos.filter(t => !t.done).slice(0, 5).map(t => (
                  <div key={t.id} className="todo-row" onClick={() => setTodos(todos.map(x => x.id === t.id ? { ...x, done: 1 } : x))}>
                    <span className="chk" />
                    <span className="text">{t.text}</span>
                    <span className="pomos">
                      {Array.from({ length: t.est }).map((_, i) => (
                        <i key={i} className={i < t.done ? 'on' : ''} />
                      ))}
                    </span>
                    <span className="assign">[ ASSIGN ]</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'TODO' && (
            <>
              <div className="todo-group-label">
                <span>OPEN QUEUE</span>
                <span>{todos.filter(t=>!t.done).length} TASKS</span>
              </div>
              <div className="todo-list">
                {todos.filter(t => !t.done).map(t => (
                  <div key={t.id} className="todo-row" onClick={() => setTodos(todos.map(x => x.id === t.id ? { ...x, done: 1 } : x))}>
                    <span className="chk" />
                    <span className="text">{t.text}</span>
                    <span className="pomos">
                      {Array.from({ length: t.est }).map((_, i) => <i key={i} />)}
                    </span>
                    <span className="assign">[ ASSIGN ]</span>
                  </div>
                ))}
                <div className="new-todo">
                  <span className="plus">+</span>
                  <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="ADD NEW TASK..." />
                </div>
              </div>
            </>
          )}
          {tab === 'DONE' && (
            <>
              <div className="todo-group-label">
                <span>COMPLETED TODAY</span>
                <span>{todos.filter(t=>t.done).length} DONE</span>
              </div>
              <div className="todo-list">
                {todos.filter(t => t.done).map(t => (
                  <div key={t.id} className="todo-row done" onClick={() => setTodos(todos.map(x => x.id === t.id ? { ...x, done: 0 } : x))}>
                    <span className="chk" />
                    <span className="text">{t.text}</span>
                    <span className="pomos">
                      {Array.from({ length: t.est }).map((_, i) => <i key={i} className="on" />)}
                    </span>
                    <span className="assign">[ OPEN ]</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// ————————— Archive —————————
function Archive({ filter, onOpen }) {
  const [search, setSearch] = useState('');
  const filtered = ARCHIVE.filter(r => {
    const s = search.toLowerCase();
    return !search || r.title.toLowerCase().includes(s) || r.task.toLowerCase().includes(s) || r.id.toLowerCase().includes(s);
  });
  return (
    <div className="archive-wrap">
      <div className="arch-stats">
        <div className="arch-stat accent">
          <div><div className="lbl">RECORDS</div></div>
          <div className="val">{ARCHIVE.length}</div>
        </div>
        <div className="arch-stat">
          <div><div className="lbl">FOCUS HOURS</div></div>
          <div className="val">12H</div>
        </div>
        <div className="arch-stat">
          <div><div className="lbl">STREAK</div></div>
          <div className="val">06D</div>
        </div>
        <div className="arch-stat">
          <div><div className="lbl">LAST CAPTURE</div></div>
          <div className="val">22:25</div>
        </div>
      </div>

      <div className="arch-filters">
        <span className="af-label">RANGE</span>
        <div className="filter-chips">
          {['ALL','TODAY','WEEK','MONTH'].map(k => (
            <button key={k} className={`filter-chip ${filter === k ? 'active' : ''}`}>{k}</button>
          ))}
        </div>
        <span className="af-label" style={{ marginLeft: 16 }}>TYPE</span>
        <div className="filter-chips">
          {['ALL','25M','50M'].map(k => (
            <button key={k} className="filter-chip">{k}</button>
          ))}
        </div>
        <input className="arch-search" placeholder="SEARCH RITUALS..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="archive-grid">
        {filtered.map(r => (
          <div key={r.id} className={`rcard ${r.color}`} onClick={() => onOpen(r)}>
            <div className="rc-top">
              <span className="id">{r.id}</span>
              <span className="stamp">{r.date.slice(5)}</span>
            </div>
            <span className="sym">{r.sym}</span>
            <div>
              <div className="meta">COMPLETED</div>
              <div className="title">{r.title}</div>
              <div className="dur">{r.duration}</div>
            </div>
          </div>
        ))}
        <div className="rcard empty" onClick={() => onOpen(null)}>
          <span className="sym">+</span>
          <div className="title" style={{ fontSize: 12, letterSpacing: '0.25em' }}>NEXT RITUAL</div>
        </div>
        <div className="rcard empty">
          <span className="sym">+</span>
          <div className="title" style={{ fontSize: 12, letterSpacing: '0.25em' }}>AWAIT</div>
        </div>
      </div>
    </div>
  );
}

function RitualSheet({ r, onClose, onReturn }) {
  if (!r) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="id">RITUAL ID: {r.id}</div>
          <button className="close" onClick={onClose}>[ CLOSE ]</button>
        </div>
        <div className="s-title">{r.title}</div>
        <dl>
          <dt>DATE</dt><dd>{r.date} / {r.time}</dd>
          <dt>DURATION</dt><dd className="red">{r.duration}</dd>
          <dt>LINKED TASK</dt><dd>{r.task}</dd>
          <dt>SEQUENCE</dt><dd>{r.seq}</dd>
          <dt>STATUS</dt><dd className="red">COMPLETED</dd>
        </dl>
        <div className="ref">"{r.note}"</div>
        <div className="s-actions">
          <button className="btn-primary" onClick={onReturn}>[ RETURN TO PLANNER ]</button>
          <button className="btn-ghost" onClick={onClose}>[ CLOSE ]</button>
        </div>
      </div>
    </div>
  );
}

// ————————— Focus overlay —————————
function FocusStage({ remaining, total, paused, onResume, onPause, onComplete, onExit, clockStyle }) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = 1 - remaining / total;
  return (
    <div className="focus-screen">
      <div className="fs-poly"><div style={{ width: '80vmin', height: '60vmin' }}><PolyOutline rotate={-4} color="rgba(244,241,234,0.2)" /></div></div>
      <div className="fs-inner">
        <div className="fs-label">{paused ? '// PAUSED //' : '// SIGNAL LIVE //'}</div>
        <div className={`fs-clock ${clockStyle}`}>{mm}<span className="col">:</span>{ss}</div>
        <div className="fs-linked">#{FOCUS.tag} · {FOCUS.title}</div>
        <div className="fs-actions">
          {paused
            ? <button className="btn-primary" onClick={onResume} style={{ padding: '14px 24px', fontSize: 13 }}>[ RESUME SIGNAL ]</button>
            : <button className="btn-ghost" onClick={onPause} style={{ padding: '14px 24px', fontSize: 13 }}>[ PAUSE ]</button>}
          <button className="btn-terminal" onClick={onComplete} style={{ padding: '14px 20px' }}>[ COMPLETE LOOP ]</button>
          <button className="btn-terminal" onClick={onExit} style={{ padding: '14px 20px' }}>[ EXIT STAGE ]</button>
        </div>
      </div>
      <div className="fs-ticks"><span>00:00</span><span>06:15</span><span>12:30</span><span>18:45</span><span>25:00</span></div>
      <div className="fs-progress"><div className="fill" style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
}

// ————————— Command palette —————————
function CommandPalette({ open, onClose, setScreen, onStart }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const items = useMemo(() => ([
    { k: 'home', label: 'Go to Home', kd: '⌘1', do: () => setScreen('HOME') },
    { k: 'planner', label: 'Go to Planner', kd: '⌘2', do: () => setScreen('PLANNER') },
    { k: 'archive', label: 'Go to Archive', kd: '⌘3', do: () => setScreen('ARCHIVE') },
    { k: 'begin', label: 'Begin Ritual', kd: '⌘⏎', do: () => onStart() },
    { k: 'settings', label: 'Settings', kd: '⌘,', do: () => {} },
    { k: 'theme', label: 'Toggle Tweaks Panel', kd: '⌘T', do: () => {} },
  ].filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()))), [q, setScreen, onStart]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { setSel(s => Math.min(items.length-1, s+1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setSel(s => Math.max(0, s-1)); e.preventDefault(); }
      else if (e.key === 'Enter') { items[sel] && items[sel].do(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, sel, onClose]);

  if (!open) return null;
  return (
    <div className="cmd-bar" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSel(0); }} placeholder="Type a command or search..." />
        <div className="cmd-list">
          {items.map((it, i) => (
            <div key={it.k} className={`cmd-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => { it.do(); onClose(); }}>
              <span>›</span>
              <span>{it.label}</span>
              <span className="kd">{it.kd}</span>
            </div>
          ))}
          {items.length === 0 && <div className="cmd-item" style={{ opacity: 0.5 }}><span>No results</span></div>}
        </div>
      </div>
    </div>
  );
}

// ————————— Tweaks —————————
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "red",
  "stageIntensity": "med",
  "clockStyle": "echo"
}/*EDITMODE-END*/;

function Tweaks({ visible, state, setState }) {
  if (!visible) return null;
  const set = (k, v) => {
    setState(s => ({ ...s, [k]: v }));
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*'); } catch(e) {}
  };
  return (
    <div className="tweaks">
      <h4>[ TWEAKS ]</h4>
      <div className="row">
        <label>Accent</label>
        <div className="opts">
          {['red','amber','cyan'].map(v => (
            <button key={v} className={`opt ${state.accent === v ? 'active' : ''}`} onClick={() => set('accent', v)}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <label>Stage Intensity</label>
        <div className="opts">
          {['off','low','med','high'].map(v => (
            <button key={v} className={`opt ${state.stageIntensity === v ? 'active' : ''}`} onClick={() => set('stageIntensity', v)}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <label>Clock Style</label>
        <div className="opts">
          {['echo','clean','heavy'].map(v => (
            <button key={v} className={`opt ${state.clockStyle === v ? 'active' : ''}`} onClick={() => set('clockStyle', v)}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ————————— App —————————
function App() {
  const [screen, setScreen] = useState(() => localStorage.getItem('tomato:screen') || 'HOME');
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(true);
  const [remaining, setRemaining] = useState(24 * 60 + 29);
  const [total] = useState(25 * 60);
  const [focusMode, setFocusMode] = useState(false);

  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [openRitual, setOpenRitual] = useState(null);
  const [plannerTab, setPlannerTab] = useState('TODAY');
  const [archiveTab, setArchiveTab] = useState('ALL');
  const [now, setNow] = useState('00:00');
  const [palette, setPalette] = useState(false);

  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    }, 10000);
    const d0 = new Date();
    setNow(`${String(d0.getHours()).padStart(2,'0')}:${String(d0.getMinutes()).padStart(2,'0')}`);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running, paused]);
  useEffect(() => {
    localStorage.setItem('tomato:screen', screen);
    if (window.__stageSetState) {
      const map = { HOME: running && !paused ? 'running' : 'idle', PLANNER: 'planner', ARCHIVE: 'archive' };
      window.__stageSetState({ accent: focusMode ? 'focus' : map[screen], intensity: tweaks.stageIntensity });
    }
  }, [screen, focusMode, tweaks.stageIntensity, running, paused]);

  // Edit mode + shortcuts
  useEffect(() => {
    function onMsg(e) {
      const d = e.data; if (!d || !d.type) return;
      if (d.type === '__activate_edit_mode') setTweaksVisible(true);
      if (d.type === '__deactivate_edit_mode') setTweaksVisible(false);
    }
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
      else if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); setScreen('HOME'); }
      else if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); setScreen('PLANNER'); }
      else if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); setScreen('ARCHIVE'); }
      else if (e.key === 'Escape' && focusMode) setFocusMode(false);
    }
    window.addEventListener('message', onMsg);
    window.addEventListener('keydown', onKey);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e) {}
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey); };
  }, [focusMode]);

  // Apply tweak vars
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.accent === 'amber') { root.style.setProperty('--hero-red', '#F5A623'); root.style.setProperty('--hero-red-deep', '#C47A0A'); }
    else if (tweaks.accent === 'cyan') { root.style.setProperty('--hero-red', '#4ED8D0'); root.style.setProperty('--hero-red-deep', '#1F9C95'); }
    else { root.style.setProperty('--hero-red', '#FB3640'); root.style.setProperty('--hero-red-deep', '#D92C37'); }
  }, [tweaks]);

  const onBegin = () => { setFocusMode(true); setPaused(false); };
  const onResume = () => { setFocusMode(true); setPaused(false); };
  const onPauseMain = () => setPaused(true);

  const headTab = screen === 'PLANNER' ? plannerTab : screen === 'ARCHIVE' ? archiveTab : null;
  const setHeadTab = (t) => screen === 'PLANNER' ? setPlannerTab(t) : setArchiveTab(t);

  return (
    <div className="app" data-screen-label={screen}>
      <Sidebar
        screen={screen} setScreen={setScreen}
        running={running} paused={paused}
        remaining={remaining} total={total}
        onResume={onResume} onPause={onPauseMain} onStart={onBegin}
      />
      <div className="main">
        <PageHead screen={screen} onPalette={() => setPalette(true)} tab={headTab} setTab={setHeadTab} now={now} />
        <div className="content">
          {screen === 'HOME' && <Home running={running} paused={paused} remaining={remaining} onBegin={onBegin} onResume={onResume} clockStyle={tweaks.clockStyle} blocks={blocks} onOpenRitual={setOpenRitual} />}
          {screen === 'PLANNER' && <Planner blocks={blocks} setBlocks={setBlocks} todos={todos} setTodos={setTodos} onStart={onBegin} />}
          {screen === 'ARCHIVE' && <Archive filter={archiveTab} onOpen={setOpenRitual} />}
        </div>
      </div>

      {focusMode && <FocusStage remaining={remaining} total={total} paused={paused} onResume={() => setPaused(false)} onPause={() => setPaused(true)} onComplete={() => { setFocusMode(false); setRemaining(total); }} onExit={() => setFocusMode(false)} clockStyle={tweaks.clockStyle} />}
      {openRitual && <RitualSheet r={openRitual} onClose={() => setOpenRitual(null)} onReturn={() => { setOpenRitual(null); setScreen('PLANNER'); }} />}
      <CommandPalette open={palette} onClose={() => setPalette(false)} setScreen={setScreen} onStart={onBegin} />
      <Tweaks visible={tweaksVisible} state={tweaks} setState={setTweaks} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
