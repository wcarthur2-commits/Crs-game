// Pure game logic (no DOM). Unit-tested in tools/test-engine.mjs.
export const TRACKS = ['CRS2', 'CARF', 'INTEG'];

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export function shuffle(arr, r) {
  const b = arr.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
export function dayKey(d = new Date()) {
  const p = (n) => (n < 10 ? '0' : '') + n;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function daySeed(d = new Date()) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

export function emptyProgress() {
  return {
    v: 1, best: {}, perfect: {}, zeroStory: 0, streakBest: 0, quickBest: 0, nights: {}, qs: {}, qa: {},
    chal: {}, adv: {}, flash: {}, newsRead: {}, seenLog: {}, bookmarks: [], font: 0, route: 'CRS2',
    session: null, trees: {}, points: 0,
  };
}

// ---------- items by route ----------
export const inTrack = (route) => (x) => x && x.track === route;
// shared-info lists (news, timeline, library): own track + INTEG; INTEG route shows all
export const inInfo = (route) => (x) => route === 'INTEG' || x.track === route || x.track === 'INTEG';

// ---------- session builder ----------
// queue item: { t: 'level'|'quiz'|'flash'|'tree'|'news', id, min }
export function sessionPlan(minutes) {
  const M = Math.max(5, Math.round(minutes * 2) / 2);
  const nNews = M < 10 ? 0 : M < 30 ? 1 : 2 + Math.floor((M - 30) / 30);
  const maxLong = M < 15 ? 0 : M < 30 ? 1 : 2 + Math.floor((M - 30) / 30);
  return { M, nNews, maxLong, budget: M - nNews * 0.5 };
}

// total minutes of distinct content available for a route (sessions never repeat an item)
export function maxMinutes(D, route) {
  const lv = D.levels.items.filter((l) => l.track === route && !l.roles.includes('case')).reduce((a, l) => a + l.minutes, 0);
  const sh = D.quiz.items.filter((q) => q.track === route && q.minutes <= 1).reduce((a, q) => a + q.minutes, 0)
    + D.flashcards.items.filter((f) => f.track === route && f.minutes <= 1).reduce((a, f) => a + f.minutes, 0);
  const tr = D.trees.items.filter((t) => t.track === route).reduce((a, t) => a + t.minutes, 0);
  return Math.floor((lv + sh + tr) * 0.9 / 5) * 5; // keep headroom for the no-repeat and long-write rules
}
export function buildSession(D, { route, minutes, seed, firstLevelId }) {
  const r = rng(seed);
  const { M, nNews, maxLong, budget } = sessionPlan(Math.min(minutes, maxMinutes(D, route)));
  const levels = D.levels.items.filter((l) => l.track === route && !l.roles.includes('case'));
  const shorts = shuffle([
    ...D.quiz.items.filter((q) => q.track === route && q.minutes <= 1).map((q) => ({ t: 'quiz', id: q.id, min: q.minutes })),
    ...D.flashcards.items.filter((f) => f.track === route && f.minutes <= 1).map((f) => ({ t: 'flash', id: f.id, min: f.minutes })),
  ], r);
  const trees = shuffle(D.trees.items.filter((t) => t.track === route).map((t) => ({ t: 'tree', id: t.id, min: t.minutes })), r);
  const news = D.news.items.filter(inInfo(route)).map((n) => ({ t: 'news', id: n.id, min: n.minutes || 0.5 }));

  // long-item budget: leave room for >= 3 short items in a 5-minute run, ~25% short otherwise
  const levelBudget = M <= 5 ? budget - 1.5 : Math.max(budget - 1.5, budget * 0.75);
  const chosen = []; let tot = 0; let longs = 0;
  const first = firstLevelId && D.levels.items.find((l) => l.id === firstLevelId);
  if (first && first.minutes <= levelBudget) { chosen.push(first); tot += first.minutes; if (first.long) longs++; }
  const cand = shuffle(levels, r);
  for (let pass = 0; pass < 2; pass++) {
    for (const L of cand) {
      if (chosen.includes(L) || tot + L.minutes > levelBudget) continue;
      const last = chosen[chosen.length - 1];
      if (L.long && (longs >= maxLong || (last && last.long))) continue;
      if (pass === 0 && last && last.kind === L.kind) continue;
      chosen.push(L); tot += L.minutes; if (L.long) longs++;
    }
  }
  // fill the rest with short items (and a tree when there is room)
  let rest = budget - tot;
  const fill = [];
  let si = 0;
  if (rest >= 4 && trees.length) { fill.push(trees[0]); rest -= trees[0].min; }
  // 5-minute runs use the half-minute items first so there are 3+ short items
  if (M <= 5) shorts.sort((a, b) => a.min - b.min);
  while (rest >= 0.5 - 1e-9 && si < shorts.length) {
    const s = shorts[si++];
    if (s.min <= rest + 1e-9) { fill.push(s); rest -= s.min; }
  }
  // interleave: level, some shorts, level, ...
  const out = [];
  const L = chosen.map((l) => ({ t: 'level', id: l.id, min: l.minutes }));
  const per = L.length ? Math.ceil(fill.length / (L.length + (L.length > 1 ? 0 : 1))) : fill.length;
  let fi = 0;
  if (!L.length) out.push(...fill);
  L.forEach((x, i) => {
    out.push(x);
    const take = i === L.length - 1 ? fill.length - fi : per;
    for (let k = 0; k < take && fi < fill.length; k++) out.push(fill[fi++]);
  });
  // news after first level, then spread
  const start = news.length ? seed % news.length : 0;
  for (let k = 0; k < nNews && news.length; k++) {
    const n = news[(start + k) % news.length];
    const pos = k === 0 ? Math.min(1, out.length) : Math.min(out.length, Math.floor(((k + 1) * out.length) / (nNews + 1)) + k);
    out.splice(pos, 0, n);
  }
  return out;
}
export const queueMinutes = (q) => q.reduce((s, x) => s + x.min, 0);

// ---------- tonight ----------
export function tonightLevel(D, route, date, progress) {
  const rot = (D.sessions && D.sessions.tonight && D.sessions.tonight.rotation_by_weekday) || {};
  const kinds = rot[String(date.getDay())] || [];
  const seed = daySeed(date);
  if (kinds.includes('case')) {
    const c = D.case.items[0];
    if (c) {
      const seq = c.page_sequence || c.acts.flatMap((a) => a.level_ids);
      const nextId = seq.find((id) => !(progress.best[id] >= 0)) || seq[seq.length - 1];
      const lv = D.levels.items.find((l) => l.id === nextId);
      if (lv) return lv;
    }
  }
  let pool = D.levels.items.filter((l) => l.track === route && kinds.includes(l.kind) && !l.long && !l.roles.includes('case'));
  if (!pool.length) pool = D.levels.items.filter((l) => l.track === route && !l.long && !l.roles.includes('case'));
  return pool.length ? pool[seed % pool.length] : null;
}

// ---------- scoring (same rules as the original Page) ----------
export const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
export const score = {
  match: (misses) => clamp(100 - misses * 15),
  sort: (ok, n) => clamp((100 * ok) / n),
  order: (orderIds, answers) => clamp((100 * orderIds.filter((id, i) => id === answers[i]).length) / answers.length),
  spot: (picked, answers) => { const hits = picked.filter((id) => answers.includes(id)).length; return clamp((100 * (hits - (picked.length - hits))) / answers.length); },
  build: (picked, answers) => { const g = picked.filter((id) => answers.includes(id)).length; return clamp((100 * (g - (picked.length - g))) / answers.length); },
  story: (risk) => clamp(100 - risk * 12),
  write: (hits, total) => clamp((100 * hits) / total),
  quiz: (good, n) => clamp((100 * good) / n),
};
export function quickPoints(left, streakBefore) { return Math.round((100 + left * 10) * Math.min(1 + 0.5 * streakBefore, 3)); }
export function writeKeywordHits(text, rubric) {
  const lo = (text || '').toLowerCase();
  return rubric.map((k) => k.any.some((w) => lo.includes(String(w).toLowerCase())));
}

// ---------- mastery & progress ----------
export function mastery(D, elId, p) {
  const ls = D.levels.items.filter((l) => l.element_ids.includes(elId));
  const vals = ls.filter((l) => p.best[l.id] >= 0).map((l) => p.best[l.id]);
  const qs = p.qs[elId];
  if (qs && qs[1] > 0) vals.push(Math.round((100 * qs[0]) / qs[1]));
  return { m: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : -1, played: ls.filter((l) => p.best[l.id] >= 0).length, total: ls.length };
}
export function trackPct(D, track, p) {
  const ls = D.levels.items.filter((l) => l.track === track);
  if (!ls.length) return 0;
  return Math.round(ls.reduce((s, l) => s + Math.max(0, p.best[l.id] ?? 0), 0) / ls.length);
}
export function trackDone(D, track, p) { return D.levels.items.filter((l) => l.track === track && p.best[l.id] >= 0).length; }
export function caseActDone(c, act, p) { return act.level_ids.every((id) => p.best[id] >= 0); }

// ---------- badges ----------
export function badgeEarned(D, b, p) {
  const r = b.rule || {};
  const n = r.n ?? 1;
  const doneIds = Object.keys(p.best).filter((k) => p.best[k] >= 0);
  switch (r.type) {
    case 'levels_completed': return doneIds.length >= n;
    case 'zero_risk_story': return (p.zeroStory || 0) >= n;
    case 'perfect_kind': return ((p.perfect || {})[r.kind] || 0) >= n;
    case 'streak': return (p.streakBest || 0) >= n;
    case 'case_complete': { const c = D.case.items.find((x) => x.id === r.case_id); return !!c && c.acts.every((a) => caseActDone(c, a, p)); }
    case 'roles_each': return (r.roles || []).every((ro) => D.levels.items.filter((l) => l.roles.includes(ro) && p.best[l.id] >= 0).length >= n);
    case 'nightly': return Object.keys(p.nights || {}).length >= n;
    case 'elements_scored': return D.elements.items.filter((e) => mastery(D, e.id, p).m >= 0).length >= n;
    case 'track_levels': return trackDone(D, r.track, p) >= n;
    default: return false;
  }
}
export function badgeKnown(b) {
  return ['levels_completed', 'zero_risk_story', 'perfect_kind', 'streak', 'case_complete', 'roles_each', 'nightly', 'elements_scored', 'track_levels'].includes((b.rule || {}).type);
}

// ---------- provisions: hierarchy depth per line ----------
// Returns indent level for a provision line based on its leading marker: (1) -> 1, (a) -> 2, (i) -> 3, (A) -> 4.
export function provisionDepths(lines) {
  let lastLetter = '';
  const roman = /^\((?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)\)/;
  return lines.map((ln) => {
    const t = ln.trimStart();
    let m;
    if ((m = t.match(/^\((\d+[A-Z]*)\)/))) { lastLetter = ''; return 1; }
    if (roman.test(t)) {
      const letter = t.slice(1, t.indexOf(')'));
      // (i) right after (h), (v) after (u), (x) after (w) are letters, not roman numerals
      const prevOk = lastLetter && letter.length === 1 && lastLetter.charCodeAt(0) + 1 === letter.charCodeAt(0);
      if (prevOk) { lastLetter = letter; return 2; }
      return 3;
    }
    if ((m = t.match(/^\(([a-z]{1,2})\)/))) { lastLetter = m[1]; return 2; }
    if (/^\([A-Z]{1,2}\)/.test(t)) return 4;
    return 0;
  });
}
// defined terms like: financial institution (財務機構) means—
export function definedTerms(text) {
  const out = [];
  const re = /(^|\n)\s*([A-Za-z][A-Za-z0-9 ,\-’']{2,80}?)\s*\(([^()\n]{1,40})\)\s+(means|includes|has the meaning)/g;
  let m;
  while ((m = re.exec(text))) out.push({ term: m[2].trim(), zh: m[3].trim(), at: m.index + m[1].length });
  return out;
}
