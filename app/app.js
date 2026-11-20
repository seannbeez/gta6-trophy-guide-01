// LEONIDA CODEX — GTA VI trophy guide & tracker.
// All 55 guides live in data/trophies.json (official names and descriptions, original guides in
// numbered steps with inline citations [1]-[7]). Progress, counters and the spoiler setting are
// saved in localStorage; nothing leaves the browser. Fully offline: no external URLs anywhere.
const EARNED_KEY = 'leonida-codex-earned';
const COUNTS_KEY = 'leonida-codex-counts';
const SPOILER_KEY = 'leonida-codex-spoilers';
const params = new URLSearchParams(location.search);

const ROADMAP = [
  { id: 'S1', title: 'Chapter 1 — Arrive in Leonida', note: 'Play the story. Start Cal\u2019s fishing line and Kenton\u2019s treasure dives. Do the Chapter 1 balcony meditation before Chapter 1 ends — it may be missable.' },
  { id: 'S2', title: 'Chapter 2 — Partners & side hustles', note: 'Character switching opens after Breakfast Run. Start Billy, Bret, Moses and the garages; train Strength with your partner.' },
  { id: 'S3', title: 'Chapter 3 — Vice City opens up', note: 'Andy, Randy and Tyrone open here, plus the Key Cloner and the Dye Pack Jammer. Do Yago\u2019s timed race the moment it appears.' },
  { id: 'S4', title: 'Chapter 4 — Big jobs', note: 'Child\u2019s Play, Headliners and the VCIA Takedown. The bank vaults open — rob 5 of the 8.' },
  { id: 'S5', title: 'Chapter 5 & finale', note: 'Operation Savage Glory, then the final mission. Keep a manual save from just before the final mission — there is no mission replay.' },
  { id: 'S6', title: 'Cleanup — activities & collectibles', note: 'Stunts, shooting ranges, drone races, races, cards, WAiNK scans, challenges, vehicles, the tank, Strangers & Freaks, and unfogging the map.' },
  { id: 'S7', title: 'Cleanup — free-roam, money & 100%', note: 'The 100% checklist, partner escapes, gang operations, garages, laundering, spending, and the disputed secrets. The platinum pops when the last one does.' },
];

const KIND_LABELS = { all: 'All', story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', crime: 'Crime', side: 'Side quests', hidden: 'Hidden', earned: 'Earned', unearned: 'Unearned' };

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]'));
let counts = JSON.parse(localStorage.getItem(COUNTS_KEY) ?? '{}');
let spoilersOn = (localStorage.getItem(SPOILER_KEY) ?? '1') === '1';
const revealed = new Set();
let selectedId = Number(params.get('trophy')) || 28;
let activeTab = params.get('tab') || 'checklist';
let activeKind = params.get('filter') || 'all';
let activeGrade = params.get('grade') || 'all';
let query = '';

seedDemoIfRequested();
if (params.get('spoiler') === 'off') spoilersOn = false;

function seedDemoIfRequested() {
  if (params.get('demo') !== '1') return;
  if (localStorage.getItem(EARNED_KEY) || localStorage.getItem(COUNTS_KEY)) return;
  earned = new Set([2, 3, 4, 8, 20, 21, 23, 24, 26, 27, 31]);
  counts = { 28: 6 };
  saveEarned();
  saveCounts();
}

function saveEarned() { localStorage.setItem(EARNED_KEY, JSON.stringify([...earned])); }
function saveCounts() { localStorage.setItem(COUNTS_KEY, JSON.stringify(counts)); }
function saveSpoiler() { localStorage.setItem(SPOILER_KEY, spoilersOn ? '1' : '0'); }

function isHiddenFromViewer(t) {
  return spoilersOn && t.hidden && !earned.has(t.id) && !revealed.has(t.id);
}

function computeAuditCounts() {
  let steps = 0;
  let cited = 0;
  for (const t of trophies) {
    for (const line of t.guide.split('\n')) {
      if (/^\d+\./.test(line)) { steps++; if (/\[\d+\]/.test(line)) cited++; }
    }
  }
  const flags = { watch: 0, disagree: 0, 'single-source': 0, unconfirmed: 0 };
  for (const t of trophies) for (const f of t.flags ?? []) flags[f] = (flags[f] ?? 0) + 1;
  return {
    steps, cited,
    missable: trophies.filter((t) => t.missable).length,
    watch: flags.watch, disagree: flags.disagree, single: flags['single-source'], unconfirmed: flags.unconfirmed,
    citing: trophies.filter((t) => (t.sources ?? []).length > 0).length,
  };
}

function renderAuditStrip() {
  const a = computeAuditCounts();
  const el = document.getElementById('audit');
  el.replaceChildren();
  const parts = [
    ['<b>55</b> official trophies', null],
    ['<b>1P 2G 6S 46B</b>', null],
    ['<b>28</b> hidden', null],
    [`<b>${a.citing}/55</b> guides cite a source`, 'ok'],
    [`<b>${a.cited}/${a.steps}</b> steps cited`, 'ok'],
    ['<b>7</b> sources read 20 Nov 2026', null],
    [`<b>${a.missable}</b> possibly missable`, 'warn'],
    [`<b>${a.watch}</b> watch`, 'warn'],
    [`<b>${a.unconfirmed}</b> unconfirmed`, 'warn'],
    [`<b>${a.single}</b> single-source`, 'warn'],
    [`<b>${a.disagree}</b> disagree`, 'warn'],
  ];
  for (const [html, cls] of parts) {
    const s = document.createElement('span');
    if (cls) s.className = cls;
    s.innerHTML = html;
    el.append(s);
  }
}

function renderHeader() {
  document.getElementById('progress-num').textContent = `${earned.size}/55`;
  const gc = document.getElementById('grade-counters');
  gc.replaceChildren();
  for (const [g, label] of [['platinum', 'P'], ['gold', 'G'], ['silver', 'S'], ['bronze', 'B']]) {
    const total = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    const span = document.createElement('span');
    span.className = 'gc';
    span.innerHTML = `<b>${label}</b> ${got}/${total}`;
    gc.append(span);
  }
  document.getElementById('list-earned').textContent = `${earned.size} earned`;
}

function renderKindChips() {
  const box = document.getElementById('kind-chips');
  box.replaceChildren();
  const countsByKind = { all: trophies.length };
  for (const k of ['story', 'collectibles', 'activities', 'crime', 'side']) countsByKind[k] = trophies.filter((t) => t.kind === k).length;
  countsByKind.missable = trophies.filter((t) => t.missable).length;
  countsByKind.hidden = trophies.filter((t) => t.hidden).length;
  countsByKind.earned = earned.size;
  countsByKind.unearned = trophies.length - earned.size;
  for (const k of Object.keys(KIND_LABELS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (activeKind === k ? ' active' : '');
    b.textContent = `${KIND_LABELS[k]} ${countsByKind[k]}`;
    b.addEventListener('click', () => { activeKind = k; renderKindChips(); renderChecklist(); });
    box.append(b);
  }
}

function filteredTrophies() {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (activeGrade !== 'all' && t.grade !== activeGrade) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + (t.short ?? '')).toLowerCase().includes(q)) return false;
    switch (activeKind) {
      case 'all': return true;
      case 'missable': return !!t.missable;
      case 'hidden': return t.hidden;
      case 'earned': return earned.has(t.id);
      case 'unearned': return !earned.has(t.id);
      default: return t.kind === activeKind;
    }
  });
}

function renderChecklist() {
  const list = document.getElementById('list');
  const items = filteredTrophies();
  document.getElementById('list-count').textContent = `${items.length} trophies`;
  list.replaceChildren();
  for (const t of items) {
    const li = document.createElement('li');
    if (selectedId === t.id) li.classList.add('selected');
    if (earned.has(t.id)) li.classList.add('earned');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', (e) => { e.stopPropagation(); toggleEarned(t.id, box.checked); });
    li.append(box);
    const body = document.createElement('div');
    body.style.minWidth = '0';
    if (isHiddenFromViewer(t)) {
      const name = document.createElement('div');
      name.className = 'tl-name';
      name.textContent = 'Hidden trophy';
      const desc = document.createElement('div');
      desc.className = 'tl-desc';
      desc.textContent = 'Hidden until earned — turn spoilers off, or reveal it to read the guide.';
      body.append(name, desc);
    } else {
      const name = document.createElement('div');
      name.className = 'tl-name';
      name.textContent = t.name;
      const desc = document.createElement('div');
      desc.className = 'tl-desc';
      desc.textContent = t.description;
      body.append(name, desc);
    }
    const meta = document.createElement('div');
    meta.className = 'tl-meta';
    const badge = document.createElement('span');
    badge.className = `badge ${t.grade}`;
    badge.textContent = t.grade;
    meta.append(badge);
    if (t.missable) { const m = document.createElement('span'); m.className = 'tag miss'; m.textContent = 'possibly missable'; meta.append(m); }
    if ((t.flags ?? []).includes('watch')) { const w = document.createElement('span'); w.className = 'tag watch'; w.textContent = 'watch'; meta.append(w); }
    if ((t.flags ?? []).includes('unconfirmed')) { const u = document.createElement('span'); u.className = 'tag unconf'; u.textContent = 'unconfirmed'; meta.append(u); }
    if ((t.flags ?? []).includes('disagree')) { const d = document.createElement('span'); d.className = 'tag miss'; d.textContent = 'sources disagree'; meta.append(d); }
    if (t.count) {
      const c = document.createElement('span');
      c.className = 'tl-count';
      c.textContent = `${(counts[t.id] ?? 0).toLocaleString('en-US')}/${t.count.target.toLocaleString('en-US')} ${t.count.label}`;
      meta.append(c);
    }
    body.append(meta);
    li.append(body);
    li.addEventListener('click', (e) => { if (e.target !== box) selectTrophy(t.id); });
    list.append(li);
  }
}

function appendCitedText(parent, text) {
  // Splits "… [1][2]" into text nodes and superscript source links.
  const parts = text.split(/\[(\d+)\]/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { if (parts[i]) parent.append(document.createTextNode(parts[i])); }
    else {
      const sup = document.createElement('sup');
      const a = document.createElement('a');
      a.href = `#src-${parts[i]}`;
      a.textContent = `[${parts[i]}]`;
      sup.append(a);
      parent.append(sup);
    }
  }
}

function renderGuidePane() {
  const pane = document.getElementById('guide');
  const t = byId.get(selectedId);
  pane.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'guide-empty';
    p.textContent = 'Pick a trophy from the checklist to read its guide.';
    pane.append(p);
    return;
  }
  if (isHiddenFromViewer(t)) {
    const h = document.createElement('h2');
    h.className = 'gtitle';
    h.textContent = 'Hidden trophy';
    const notice = document.createElement('div');
    notice.className = 'spoiler-notice';
    notice.textContent = 'This is a story trophy, hidden until earned. Spoilers are on — reveal it only if you want the guide now.';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reveal the guide';
    btn.addEventListener('click', () => { revealed.add(t.id); renderChecklist(); renderGuidePane(); });
    notice.append(document.createElement('br'), btn);
    pane.append(h, notice);
    return;
  }
  const h = document.createElement('h2');
  h.className = 'gtitle';
  h.textContent = t.name;
  pane.append(h);
  const chips = document.createElement('div');
  chips.className = 'chips-row';
  const badge = document.createElement('span');
  badge.className = `badge ${t.grade}`;
  badge.textContent = t.grade;
  chips.append(badge);
  for (const [label] of [[KIND_LABELS[t.kind] ?? t.kind], [t.stage], [t.hidden ? 'hidden' : null]]) {
    if (!label) continue;
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = label;
    chips.append(s);
  }
  if (t.missable) { const m = document.createElement('span'); m.className = 'tag miss'; m.textContent = 'possibly missable'; chips.append(m); }
  pane.append(chips);
  const official = document.createElement('blockquote');
  official.className = 'official';
  official.textContent = `Official: “${t.description}”`;
  pane.append(official);
  const short = document.createElement('p');
  short.className = 'inshort';
  short.innerHTML = '<b>In short:</b> ';
  short.append(document.createTextNode(t.short ?? ''));
  pane.append(short);
  const ol = document.createElement('ol');
  ol.className = 'steps';
  for (const line of t.guide.split('\n')) {
    const m = line.match(/^\d+\.\s*(.*)$/);
    if (!m) continue;
    const li = document.createElement('li');
    appendCitedText(li, m[1]);
    ol.append(li);
  }
  pane.append(ol);
  if (t.disagree) {
    const box = document.createElement('div');
    box.className = 'disagree-box';
    const bh = document.createElement('h3');
    bh.textContent = 'Sources disagree — both versions shown';
    box.append(bh);
    const p = document.createElement('p');
    p.style.margin = '0';
    appendCitedText(p, t.disagree);
    box.append(p);
    pane.append(box);
  }
  if ((t.flags ?? []).includes('unconfirmed')) {
    const box = document.createElement('div');
    box.className = 'watch-box';
    const bh = document.createElement('h3');
    bh.textContent = 'Unconfirmed';
    box.append(bh);
    const p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = 'No guide has pinned down this trophy yet. Do not trust any method that claims otherwise — this page will be updated when the trigger is cracked.';
    box.append(p);
    pane.append(box);
  }
  if (t.count) renderCounterWidget(pane, t);
  const srcLine = document.createElement('p');
  srcLine.className = 'sources-note';
  srcLine.textContent = `Cited sources: ${(t.sources ?? []).map((n) => `[${n}] ${sources.find((s) => s.id === n)?.name ?? n}`).join(' · ')}`;
  pane.append(srcLine);
}

function renderCounterWidget(pane, t) {
  const target = t.count.target;
  const step = target >= 10000 ? 1000 : target >= 100 ? 10 : 1;
  const wrap = document.createElement('div');
  wrap.className = 'counter';
  const row = document.createElement('div');
  row.className = 'c-row';
  const label = document.createElement('span');
  label.textContent = 'Your count:';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `Decrease ${t.count.label} count`);
  const val = document.createElement('span');
  val.className = 'c-val';
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', `Increase ${t.count.label} count`);
  const unit = document.createElement('span');
  unit.textContent = `/ ${target.toLocaleString('en-US')} ${t.count.label} (step ${step.toLocaleString('en-US')})`;
  const refresh = () => {
    const v = counts[t.id] ?? 0;
    val.textContent = v.toLocaleString('en-US');
    fill.style.width = `${Math.min(100, (v / target) * 100)}%`;
  };
  minus.addEventListener('click', () => { counts[t.id] = Math.max(0, (counts[t.id] ?? 0) - step); saveCounts(); refresh(); renderChecklist(); });
  plus.addEventListener('click', () => { counts[t.id] = Math.min(target, (counts[t.id] ?? 0) + step); saveCounts(); refresh(); renderChecklist(); });
  row.append(label, minus, val, plus, unit);
  const bar = document.createElement('div');
  bar.className = 'c-bar';
  const fill = document.createElement('div');
  fill.className = 'c-fill';
  bar.append(fill);
  const note = document.createElement('div');
  note.className = 'c-note';
  note.textContent = 'Saved in your browser. Mark the trophy earned in the checklist when the count is done.';
  wrap.append(row, bar, note);
  pane.append(wrap);
  refresh();
}

function renderSourcesPanel() {
  const ol = document.getElementById('sources-panel');
  ol.replaceChildren();
  for (const s of sources) {
    const citedBy = trophies.filter((t) => (t.sources ?? []).includes(s.id)).length;
    const li = document.createElement('li');
    li.id = `src-${s.id}`;
    const name = document.createElement('span');
    name.className = 's-name';
    name.textContent = s.name;
    const title = document.createElement('span');
    title.className = 's-title';
    title.textContent = s.title;
    const url = document.createElement('span');
    url.className = 's-url';
    url.textContent = s.url;
    const cited = document.createElement('span');
    cited.className = 's-cited';
    cited.textContent = `cited by ${citedBy} of 55 guides · read ${s.read}`;
    li.append(name, title, url, cited);
    ol.append(li);
  }
}

function renderRoadmap() {
  const box = document.getElementById('roadmap');
  box.replaceChildren();
  for (const stage of ROADMAP) {
    const members = trophies.filter((t) => t.stage === stage.id);
    const done = members.filter((t) => earned.has(t.id)).length;
    const card = document.createElement('div');
    card.className = 'stage-card';
    const h = document.createElement('h3');
    h.innerHTML = `<span>${stage.id}</span> ${stage.title} — ${done}/${members.length} earned`;
    const p = document.createElement('p');
    p.textContent = stage.note;
    const ul = document.createElement('ul');
    for (const t of members) {
      const li = document.createElement('li');
      if (earned.has(t.id)) li.className = 'done';
      li.textContent = `${earned.has(t.id) ? '✓ ' : ''}${isHiddenFromViewer(t) ? 'Hidden trophy' : t.name}${t.missable ? ' — possibly missable' : ''}`;
      li.addEventListener('click', () => { selectTrophy(t.id); applyTab('checklist'); });
      li.style.cursor = 'pointer';
      ul.append(li);
    }
    card.append(h, p, ul);
    box.append(card);
  }
}

function renderMissables() {
  const box = document.getElementById('missables');
  box.replaceChildren();
  const addCard = (cls, title, trophyId, bodyText) => {
    const card = document.createElement('div');
    card.className = `miss-card ${cls}`;
    const h = document.createElement('h3');
    h.textContent = title;
    card.append(h);
    if (trophyId) {
      const t = byId.get(trophyId);
      const name = document.createElement('p');
      name.className = 'm-trophy';
      name.textContent = t ? t.name : '';
      card.append(name);
    }
    const p = document.createElement('p');
    p.textContent = bodyText;
    card.append(p);
    if (trophyId) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = 'Open the guide';
      btn.addEventListener('click', () => { selectTrophy(trophyId); applyTab('checklist'); });
      card.append(btn);
    }
    box.append(card);
  };
  addCard('warn', 'Possibly missable — 1', 28, 'Meditate at every spot across Leonida. Do the Chapter 1 balcony meditation BEFORE Chapter 1 ends: after Down to Earth, find Lucia in the kitchen in the morning and follow her to the balcony. Keep a Chapter 1 manual save until the trophy pops — it is unconfirmed whether the balcony meditation is required.');
  addCard('info', 'Watch — stranger strands', 25, 'Only some stranger questlines count toward the 8 strands: Kirk, Kyle, Yago and Pilot Pete are confirmed; Moses, Tyrone, Yasmani, Andy, Billy and Eddie do not count. Do Yago\u2019s timed race the moment it appears in Chapter 3.');
  addCard('info', 'Watch — which animal?', 29, 'Bret\u2019s hunting quests are confirmed, but which animal exactly unlocks the trophy is still unconfirmed. The 15 Target Decks (all needed for 100%) are the safer target.');
  addCard('danger', 'Unconfirmed — 1', 49, 'No guide has pinned down this trophy\u2019s trigger. PowerPyx lists it as currently unknown, believed to be related to the Payday Loans store from the Prologue. Do not trust any method that claims otherwise yet.');
  addCard('info', 'Single-source — 1', 48, 'The 500-action target for Actions Speak Louder comes from GTABase via eGamers — no second guide confirms the number. The count itself is visible by clicking the trophy in the trophy list.');
  addCard('warn', 'Sources disagree — 5', null, 'Positive Mental Attitude (18 vs 15 meditations), In The Beginning…, Capital Offense, The Truth Is Out There and Ten Pin: PowerPyx gives concrete methods, while KeenGamer, eGamers and GTA-Zone still list them as unconfirmed. Each guide shows both versions.');
  addCard('info', 'Save advice', null, 'The game has 15 manual save slots plus 1 autosave. Save before Chapter 1 ends (balcony meditation), before the final mission (no mission replay), and before any story choice you might regret. Never play with cheats before the credits — cheats disable trophies and saving.');
}

function renderSourcesFull() {
  const box = document.getElementById('sources-full');
  box.replaceChildren();
  for (const s of sources) {
    const citedBy = trophies.filter((t) => (t.sources ?? []).includes(s.id)).length;
    const card = document.createElement('div');
    card.className = 'src-card';
    const h = document.createElement('h3');
    h.innerHTML = `<span>[${s.id}]</span> ${s.name}`;
    const title = document.createElement('p');
    title.textContent = s.title;
    const url = document.createElement('p');
    url.className = 's-url';
    url.textContent = s.url;
    const meta = document.createElement('p');
    meta.textContent = `Read in full on ${s.read} · cited by ${citedBy} of 55 guides.`;
    card.append(h, title, url, meta);
    box.append(card);
  }
}

function toggleEarned(id, on) {
  if (on) earned.add(id); else earned.delete(id);
  saveEarned();
  renderHeader();
  renderKindChips();
  renderChecklist();
  renderRoadmap();
}

function selectTrophy(id) {
  selectedId = id;
  renderChecklist();
  renderGuidePane();
}

function applyTab(tab) {
  activeTab = tab;
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('active', b.dataset.tab === tab);
  for (const page of document.querySelectorAll('.tab-page')) page.classList.toggle('active', page.id === `tab-${tab}`);
  if (tab === 'roadmap') renderRoadmap();
  if (tab === 'missables') renderMissables();
  if (tab === 'sources') renderSourcesFull();
}

function exportProgress() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'LEONIDA CODEX', earned: [...earned], counts }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-codex-progress.json';
  a.click();
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = (data.earned ?? data ?? []).filter((id) => byId.has(id));
    earned = new Set(ids);
    if (data.counts) counts = Object.fromEntries(Object.entries(data.counts).filter(([k]) => byId.has(Number(k))));
    saveEarned();
    saveCounts();
    renderHeader();
    renderKindChips();
    renderChecklist();
    renderGuidePane();
    renderRoadmap();
  } catch {
    alert('That file is not a LEONIDA CODEX progress export.');
  }
}

document.getElementById('export').addEventListener('click', exportProgress);
document.getElementById('import').addEventListener('change', (e) => importProgress(e.target.files[0]));
document.getElementById('grade').addEventListener('change', (e) => { activeGrade = e.target.value; renderChecklist(); });
document.getElementById('search').addEventListener('input', (e) => { query = e.target.value; renderChecklist(); });
document.getElementById('spoiler').checked = spoilersOn;
document.getElementById('spoiler').addEventListener('change', (e) => { spoilersOn = e.target.checked; saveSpoiler(); renderChecklist(); renderGuidePane(); renderRoadmap(); });
for (const b of document.querySelectorAll('#tabs button')) b.addEventListener('click', () => applyTab(b.dataset.tab));

renderAuditStrip();
renderHeader();
renderKindChips();
renderChecklist();
renderGuidePane();
renderSourcesPanel();
applyTab(activeTab);
