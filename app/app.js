// LEONIDA CODEX — GTA VI trophy guide & tracker.
// Plain ES module, no dependencies. Loads app/data/trophies.json, renders the
// checklist, the guide pane, the roadmap, the honesty register and the sources,
// and keeps progress in localStorage so it survives a reload.

const DATA_URL = 'data/trophies.json';
const LS_EARNED = 'leonida-codex-earned';
const LS_COUNTS = 'leonida-codex-counts';
const LS_HIDE_SPOILERS = 'leonida-codex-hide-spoilers';

const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  crime: 'Crime',
  side: 'Side quests',
  misc: 'Misc',
};

const STAGE_INFO = {
  S1: { title: 'Chapter 1 — Arrive in Leonida', blurb: 'Play the story. Start Cal\u2019s fishing line and Kenton\u2019s treasure dives. Do the Chapter 1 balcony meditation before Chapter 1 ends — it may be missable.' },
  S2: { title: 'Chapter 2 — Partners & side hustles', blurb: 'Character switching opens after Breakfast Run. Start Billy, Bret, Moses and the garages; train Strength with your partner.' },
  S3: { title: 'Chapter 3 — Vice City opens up', blurb: 'Andy, Randy and Tyrone open here, plus the Key Cloner and the Dye Pack Jammer. Do Yago\u2019s timed race the moment it appears.' },
  S4: { title: 'Chapter 4 — Big jobs', blurb: 'Child\u2019s Play, Headliners and the VCIA Takedown. The bank vaults open — rob 5 of the 8.' },
  S5: { title: 'Chapter 5 & finale', blurb: 'Operation Savage Glory, then the final mission. Keep a manual save from just before the final mission — there is no mission replay.' },
  S6: { title: 'Cleanup — activities & collectibles', blurb: 'Stunts, shooting ranges, drone races, races, cards, WAiNK scans, challenges, vehicles, the tank, Strangers & Freaks, and unfogging the map.' },
  S7: { title: 'Cleanup — free-roam, money & 100%', blurb: 'The 100% checklist, partner escapes, gang operations, garages, laundering, spending, and the disputed secrets. The platinum pops when the last one does.' },
};

let DATA = null;
let selectedId = 28;
let activeFilter = 'all';
let gradeFilter = '';
let searchText = '';
let earned = new Set();
let counts = {};
let hideSpoilers = true;

function loadState() {
  try { earned = new Set(JSON.parse(localStorage.getItem(LS_EARNED) || '[]')); } catch (e) { earned = new Set(); }
  try { counts = JSON.parse(localStorage.getItem(LS_COUNTS) || '{}'); } catch (e) { counts = {}; }
  const stored = localStorage.getItem(LS_HIDE_SPOILERS);
  hideSpoilers = stored === null ? true : stored === '1';
}
function saveState() {
  localStorage.setItem(LS_EARNED, JSON.stringify([...earned]));
  localStorage.setItem(LS_COUNTS, JSON.stringify(counts));
  localStorage.setItem(LS_HIDE_SPOILERS, hideSpoilers ? '1' : '0');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cite(text) {
  return escapeHtml(text).replace(/\[(\d+)\]/g, '<span class="cite">[$1]</span>');
}
function sourceName(id) {
  const s = DATA.sources.find((x) => x.id === id);
  return s ? s.name : '?' + id;
}
function citedBy(id) {
  return DATA.trophies.filter((t) => (t.sources || []).includes(id)).length;
}
function stepStats() {
  let total = 0;
  let cited = 0;
  for (const t of DATA.trophies) {
    for (const line of t.guide.split('\n')) {
      total += 1;
      if (line.includes('[')) cited += 1;
    }
  }
  return { total, cited };
}
function guidesCiteSource() {
  return DATA.trophies.filter((t) => (t.sources || []).length > 0).length;
}
function flagCount(flag) {
  return DATA.trophies.filter((t) => (t.flags || []).includes(flag)).length;
}
function isHidden(t) {
  return t.hidden && hideSpoilers && !earned.has(t.id);
}

function renderAudit() {
  const steps = stepStats();
  const el = document.getElementById('auditStrip');
  el.innerHTML =
    '<span><b>55</b> official trophies</span>' +
    '<span><b>1P 2G 6S 46B</b></span>' +
    '<span><b>28</b> hidden</span>' +
    '<span class="ok">' + guidesCiteSource() + '/55 guides cite a source</span>' +
    '<span class="ok">' + steps.cited + '/' + steps.total + ' steps cited</span>' +
    '<span><b>7</b> sources read 20 Nov 2026</span>' +
    '<span class="warn">1 possibly missable</span>' +
    '<span class="warn">' + flagCount('watch') + ' watch</span>' +
    '<span class="warn">' + flagCount('unconfirmed') + ' unconfirmed</span>' +
    '<span class="warn">' + flagCount('single-source') + ' single-source</span>' +
    '<span class="warn">' + flagCount('disagree') + ' disagree</span>';
}

function renderGradeChips() {
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  const labels = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
  document.getElementById('gradeChips').innerHTML = grades.map((g) => {
    const total = DATA.trophies.filter((t) => t.grade === g).length;
    const got = DATA.trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return '<span>' + labels[g] + ' ' + got + '/' + total + '</span>';
  }).join('');
  document.getElementById('earnedCount').textContent = earned.size + '/55';
}

function renderChips() {
  const defs = [
    ['all', 'All 55'],
    ['story', 'Story ' + DATA.trophies.filter((t) => t.kind === 'story').length],
    ['missable', 'Missable ' + DATA.trophies.filter((t) => t.missable).length],
    ['collectibles', 'Collectibles ' + DATA.trophies.filter((t) => t.kind === 'collectibles').length],
    ['activities', 'Activities ' + DATA.trophies.filter((t) => t.kind === 'activities').length],
    ['crime', 'Crime ' + DATA.trophies.filter((t) => t.kind === 'crime').length],
    ['side', 'Side quests ' + DATA.trophies.filter((t) => t.kind === 'side').length],
    ['hidden', 'Hidden ' + DATA.trophies.filter((t) => t.hidden).length],
    ['earned', 'Earned ' + earned.size],
    ['unearned', 'Unearned ' + (55 - earned.size)],
  ];
  document.getElementById('filterChips').innerHTML = defs.map(([key, label]) =>
    '<button type="button" data-filter="' + key + '"' + (activeFilter === key ? ' class="active"' : '') + '>' + label + '</button>'
  ).join('');
  for (const btn of document.querySelectorAll('#filterChips button')) {
    btn.addEventListener('click', () => { activeFilter = btn.dataset.filter; renderChips(); renderList(); });
  }
}

function trophyMatches(t) {
  if (gradeFilter && t.grade !== gradeFilter) return false;
  if (searchText) {
    const hay = (t.name + ' ' + t.description + ' ' + t.short).toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  switch (activeFilter) {
    case 'all': return true;
    case 'story': case 'collectibles': case 'activities': case 'crime': case 'side':
      return t.kind === activeFilter;
    case 'missable': return !!t.missable;
    case 'hidden': return t.hidden;
    case 'earned': return earned.has(t.id);
    case 'unearned': return !earned.has(t.id);
    default: return true;
  }
}

function renderList() {
  const list = DATA.trophies.filter(trophyMatches);
  document.getElementById('listCount').textContent = list.length + ' trophies';
  document.getElementById('listEarned').textContent = list.filter((t) => earned.has(t.id)).length + ' earned';
  const ul = document.getElementById('trophyList');
  ul.innerHTML = list.map((t) => {
    const hidden = isHidden(t);
    const name = hidden ? 'Hidden trophy' : escapeHtml(t.name);
    const desc = hidden ? 'Hidden until earned — turn spoilers off, or reveal it to read the guide.' : escapeHtml(t.description);
    const flags = [];
    if (t.missable) flags.push('<span class="badge flag">possibly missable</span>');
    if ((t.flags || []).includes('watch')) flags.push('<span class="badge flag">watch</span>');
    if ((t.flags || []).includes('unconfirmed')) flags.push('<span class="badge flag">unconfirmed</span>');
    if ((t.flags || []).includes('single-source')) flags.push('<span class="badge flag">single-source</span>');
    if ((t.flags || []).includes('disagree')) flags.push('<span class="badge flag">disagree</span>');
    const classes = [];
    if (t.id === selectedId) classes.push('selected');
    if (earned.has(t.id)) classes.push('earned');
    return '<li data-id="' + t.id + '"' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') + '>' +
      '<div class="trophy-row">' +
      '<input type="checkbox" data-earn="' + t.id + '"' + (earned.has(t.id) ? ' checked' : '') + ' aria-label="Mark earned">' +
      '<div><div class="trophy-name">' + name + '</div>' +
      '<div class="trophy-desc">' + desc + '</div>' +
      '<div class="trophy-badges"><span class="badge ' + t.grade + '">' + t.grade + '</span>' +
      '<span class="badge hidden-trophy">' + t.stage + '</span>' + flags.join('') + '</div></div>' +
      '</div></li>';
  }).join('');
  for (const li of ul.querySelectorAll('li')) {
    li.addEventListener('click', (ev) => {
      if (ev.target.matches('input[data-earn]')) return;
      selectTrophy(Number(li.dataset.id));
    });
  }
  for (const box of ul.querySelectorAll('input[data-earn]')) {
    box.addEventListener('change', () => {
      const id = Number(box.dataset.earn);
      if (box.checked) earned.add(id); else earned.delete(id);
      saveState();
      renderGradeChips(); renderChips(); renderList(); renderGuide(selectedId); renderRoadmap();
    });
  }
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderGuide(id);
}

function renderGuide(id) {
  const t = DATA.trophies.find((x) => x.id === id) || DATA.trophies[0];
  const pane = document.getElementById('guidePane');
  const hidden = isHidden(t);
  const steps = t.guide.split('\n').map((line) => line.replace(/^\d+\.\s*/, ''));
  let html = '<h2>' + (hidden ? 'Hidden trophy' : escapeHtml(t.name)) + '</h2>';
  html += '<div class="guide-meta"><span class="badge ' + t.grade + '">' + t.grade + '</span>' +
    '<span class="badge hidden-trophy">' + escapeHtml(KIND_LABELS[t.kind] || t.kind) + '</span>' +
    '<span class="badge hidden-trophy">' + t.stage + '</span>';
  if (t.missable) html += '<span class="badge flag">possibly missable</span>';
  html += '</div>';
  if (hidden) {
    html += '<p class="official">Hidden until earned — turn the spoiler setting off, or mark it earned in the checklist, to read the guide.</p>';
  } else {
    html += '<p class="official">Official: &ldquo;' + escapeHtml(t.description) + '&rdquo;</p>';
    html += '<p class="short"><b>In short:</b> ' + escapeHtml(t.short) + '</p>';
    html += '<ol>' + steps.map((s) => '<li>' + cite(s) + '</li>').join('') + '</ol>';
    if (t.disagree) {
      html += '<div class="disagree-box"><h3>SOURCES DISAGREE — BOTH VERSIONS SHOWN</h3><p>' + cite(t.disagree) + '</p></div>';
    }
    if (t.count) {
      const cur = counts[t.id] || 0;
      const pct = Math.min(100, Math.round((cur / t.count.target) * 100));
      html += '<div class="counter-box"><div class="counter-row"><span>Your count:</span>' +
        '<button type="button" data-count-down="' + t.id + '" aria-label="Decrease count">−</button>' +
        '<span class="count-num">' + cur + '</span>' +
        '<button type="button" data-count-up="' + t.id + '" aria-label="Increase count">+</button>' +
        '<span> / ' + t.count.target + ' ' + escapeHtml(t.count.label) + '</span></div>' +
        '<div class="counter-bar"><i style="width:' + pct + '%"></i></div>' +
        '<p class="counter-note">Saved in your browser. Mark the trophy earned in the checklist when the count is done.</p></div>';
    }
    html += '<p class="cited-by">Cited sources: ' + (t.sources || []).map((s) => '[' + s + '] ' + escapeHtml(sourceName(s))).join(' · ') + '</p>';
  }
  pane.innerHTML = html;
  for (const btn of pane.querySelectorAll('[data-count-up]')) {
    btn.addEventListener('click', () => {
      const tid = Number(btn.dataset.countUp);
      const trophy = DATA.trophies.find((x) => x.id === tid);
      counts[tid] = Math.min(trophy.count.target, (counts[tid] || 0) + 1);
      saveState(); renderGuide(selectedId);
    });
  }
  for (const btn of pane.querySelectorAll('[data-count-down]')) {
    btn.addEventListener('click', () => {
      const tid = Number(btn.dataset.countDown);
      counts[tid] = Math.max(0, (counts[tid] || 0) - 1);
      saveState(); renderGuide(selectedId);
    });
  }
}

function renderSourcesPanel() {
  document.getElementById('sourceList').innerHTML = DATA.sources.map((s) =>
    '<div class="source-card"><h3><span class="src-num">[' + s.id + ']</span> ' + escapeHtml(s.name) + '</h3>' +
    '<p>' + escapeHtml(s.title) + '</p>' +
    '<p class="src-url">' + escapeHtml(s.url) + '</p>' +
    '<p class="src-count">cited by ' + citedBy(s.id) + ' of 55 guides · read ' + escapeHtml(s.read) + '</p></div>'
  ).join('');
}

function renderRoadmap() {
  const grid = document.getElementById('stageGrid');
  grid.innerHTML = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].map((stage) => {
    const members = DATA.trophies.filter((t) => t.stage === stage);
    const done = members.filter((t) => earned.has(t.id)).length;
    const items = members.map((t) => {
      const label = earned.has(t.id) ? '✓ ' + escapeHtml(t.name) : (isHidden(t) ? 'Hidden trophy' : escapeHtml(t.name));
      return '<li' + (earned.has(t.id) ? ' class="done"' : '') + '>' + label + '</li>';
    }).join('');
    return '<div class="stage-card"><h3><span class="stage-tag">' + stage + '</span> ' + escapeHtml(STAGE_INFO[stage].title) + ' — ' + done + '/' + members.length + ' earned</h3>' +
      '<p>' + escapeHtml(STAGE_INFO[stage].blurb) + '</p><ul>' + items + '</ul></div>';
  }).join('');
}

function renderMissables() {
  const cards = [];
  const missable = DATA.trophies.find((t) => t.missable);
  cards.push({ tag: 'Possibly missable — 1', name: missable.name, text: 'Meditate at every spot across Leonida. Do the Chapter 1 balcony meditation BEFORE Chapter 1 ends: after Down to Earth, find Lucia in the kitchen in the morning and follow her to the balcony. Keep a Chapter 1 manual save until the trophy pops — it is unconfirmed whether the balcony meditation is required.', id: missable.id });
  for (const t of DATA.trophies.filter((x) => (x.flags || []).includes('watch'))) {
    const tag = t.id === 25 ? 'Watch — stranger strands' : 'Watch — which animal?';
    const text = t.id === 25
      ? 'Only some stranger questlines count toward the 8 strands: Kirk, Kyle, Yago and Pilot Pete are confirmed; Moses, Tyrone, Yasmani, Andy, Billy and Eddie do not count. Do Yago\u2019s timed race the moment it appears in Chapter 3.'
      : 'Bret\u2019s hunting quests are confirmed, but which animal exactly unlocks the trophy is still unconfirmed. The 15 Target Decks (all needed for 100%) are the safer target.';
    cards.push({ tag, name: t.name, text, id: t.id });
  }
  const unconfirmed = DATA.trophies.find((t) => (t.flags || []).includes('unconfirmed'));
  cards.push({ tag: 'Unconfirmed — 1', name: unconfirmed.name, text: 'No guide has pinned down this trophy\u2019s trigger. PowerPyx lists it as currently unknown, believed to be related to the Payday Loans store from the Prologue. Do not trust any method that claims otherwise yet.', id: unconfirmed.id });
  const single = DATA.trophies.find((t) => (t.flags || []).includes('single-source'));
  cards.push({ tag: 'Single-source — 1', name: single.name, text: 'The 500-action target for Actions Speak Louder comes from GTABase via eGamers — no second guide confirms the number. The count itself is visible by clicking the trophy in the trophy list.', id: single.id });
  const disagreeNames = DATA.trophies.filter((t) => (t.flags || []).includes('disagree')).map((t) => t.name).join(', ');
  cards.push({ tag: 'Sources disagree — 5', name: 'Five disputed methods', text: disagreeNames + ': PowerPyx gives concrete methods, while KeenGamer, eGamers and GTA-Zone still list them as unconfirmed. Each guide shows both versions.', id: 28 });
  document.getElementById('honestyGrid').innerHTML = cards.map((c) =>
    '<div class="honesty-card"><h3><span class="honesty-tag">' + escapeHtml(c.tag) + '</span></h3>' +
    '<p><b>' + escapeHtml(c.name) + '</b></p><p>' + escapeHtml(c.text) + '</p>' +
    '<button type="button" data-open-guide="' + c.id + '">Open the guide</button></div>'
  ).join('');
  for (const btn of document.querySelectorAll('[data-open-guide]')) {
    btn.addEventListener('click', () => {
      selectTrophy(Number(btn.dataset.openGuide));
      switchView('checklist');
    });
  }
}

function renderSourcesView() {
  document.getElementById('sourceGrid').innerHTML = DATA.sources.map((s) =>
    '<div class="source-card"><h3><span class="src-num">[' + s.id + ']</span> ' + escapeHtml(s.name) + '</h3>' +
    '<p>' + escapeHtml(s.title) + '</p>' +
    '<p class="src-url">' + escapeHtml(s.url) + '</p>' +
    '<p>Read in full on ' + escapeHtml(s.read) + ' · cited by ' + citedBy(s.id) + ' of 55 guides.</p></div>'
  ).join('');
}

function switchView(name) {
  for (const btn of document.querySelectorAll('.tabs button')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  for (const section of document.querySelectorAll('main .view')) {
    section.classList.toggle('active', section.id === 'view-' + name);
  }
}

function exportProgress() {
  const payload = { app: 'LEONIDA CODEX', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b), counts };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-codex-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55));
      if (data.counts && typeof data.counts === 'object') counts = data.counts;
      saveState();
      renderGradeChips(); renderChips(); renderList(); renderGuide(selectedId); renderRoadmap();
    } catch (e) {
      alert('That file is not a LEONIDA CODEX progress export.');
    }
  };
  reader.readAsText(file);
}

async function init() {
  loadState();
  const res = await fetch(DATA_URL);
  DATA = await res.json();
  const hash = window.location.hash.match(/^#trophy-(\d+)$/);
  if (hash) {
    const id = Number(hash[1]);
    if (DATA.trophies.some((t) => t.id === id)) selectedId = id;
  }
  document.getElementById('spoilerToggle').checked = hideSpoilers;
  document.getElementById('spoilerToggle').addEventListener('change', (ev) => {
    hideSpoilers = ev.target.checked;
    saveState(); renderList(); renderGuide(selectedId); renderRoadmap();
  });
  document.getElementById('searchBox').addEventListener('input', (ev) => {
    searchText = ev.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('gradeSelect').addEventListener('change', (ev) => {
    gradeFilter = ev.target.value;
    renderList();
  });
  for (const btn of document.querySelectorAll('.tabs button')) {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  }
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (ev) => {
    if (ev.target.files.length) importProgress(ev.target.files[0]);
    ev.target.value = '';
  });
  renderAudit();
  renderGradeChips();
  renderChips();
  renderList();
  renderGuide(selectedId);
  renderSourcesPanel();
  renderRoadmap();
  renderMissables();
  renderSourcesView();
}

init();
