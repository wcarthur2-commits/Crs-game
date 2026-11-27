// All screens except play and the provision reader.
import { h, s, icon, btn, ring, bar, sheet, seg, chips, toast, closeSheets } from './ui.js?v=v6';
import { D, IX, P, save, nav, route, setRoute, TRACK, trackName, unreadNews, unseenLog, liveLog, logKey, isNewItem, storageOk, RECENT_DAYS } from './state.js?v=v6';
import { buildSession, maxMinutes, queueMinutes, tonightLevel, trackPct, trackDone, mastery, badgeEarned, badgeKnown, caseActDone, dayKey, rng, shuffle, inTrack, inInfo, sessionPlan } from './engine.js?v=v6';
import { screenHead, statusChips, card, detailSheet, detailBody, elementSheet, levelCard, srcLink, quoteBlock, sourcesList, termSheet, SCHEME, caveatNote } from './common.js?v=v6';
import { startSession, playOne, mcqBody } from './play.js?v=v6';
import { layeredGraph, treeFlow, venn } from './diagram.js?v=v6';

const kindLabel = (k) => (D.levels.kinds || {})[k] || k;
const KIND_ICON = { match: 'link', sort: 'buckets', order: 'list', spot: 'search', story: 'chat', build: 'blocks', write: 'pen', quiz: 'timer' };
const playerLevel = () => { const pts = P.points || 0; return { lv: Math.floor(pts / 500) + 1, pct: ((pts % 500) / 500) * 100, pts }; };

// ================= HOME =================
export function renderHome(root) {
  const tl = tonightLevel(D, route(), new Date(), P);
  const nightDone = P.nights[dayKey()] != null;
  const newsN = unreadNews().length; const logN = unseenLog().length;
  const earned = D.badges.items.filter((b) => badgeEarned(D, b, P));
  const pl = playerLevel();
  const tile = (hash, ic, cls, title, sub, extra) => h('button', { type: 'button', class: 'tile ' + cls, onclick: () => nav(hash) },
    h('span', { class: 'tile-ic' }, icon(ic, 24)), h('span', { class: 'tile-t' }, title), h('span', { class: 'tile-s' }, sub), extra || null);
  const routeTile = (t) => {
    const pct = trackPct(D, t, P); const n = D.levels.items.filter((l) => l.track === t).length;
    return h('button', { type: 'button', class: 'rt r-' + t + (route() === t ? ' on' : ''), 'aria-pressed': String(route() === t), onclick: () => setRoute(t) },
      ring(pct, { size: 52, color: TRACK[t].color }), h('b', null, TRACK[t].short), h('span', null, `${trackDone(D, t, P)}/${n} 關`));
  };
  const caseC = D.case.items[0]; const actsDone = caseC ? caseC.acts.filter((a) => caseActDone(caseC, a, P)).length : 0;
  const els = D.elements.items.filter(inTrack(route()));
  const mastered = els.filter((e) => mastery(D, e.id, P).m >= 60).length;
  root.append(h('div', { class: 'home' },
    h('div', { class: 'home-top' },
      h('div', { class: 'avatar', 'aria-hidden': 'true' }, 'Lv' + pl.lv),
      h('div', { class: 'who' }, h('b', null, '合規學習遊戲'), h('span', null, `連續打卡 ${streakDays()} 晚`)),
      h('button', { type: 'button', class: 'pill', onclick: () => nav('#/badges'), 'aria-label': '分數' }, icon('star', 16), String(pl.pts)),
      h('button', { type: 'button', class: 'icon-btn sq', onclick: () => nav('#/glossary'), 'aria-label': '詞彙表' }, icon('abc', 20)),
      h('button', { type: 'button', class: 'icon-btn sq', onclick: () => nav('#/library'), 'aria-label': '資料庫同條文' }, icon('book', 20)),
      h('button', { type: 'button', class: 'icon-btn sq', onclick: () => nav('#/settings'), 'aria-label': '設定' }, icon('gear', 20))),
    h('div', { class: 'routes', role: 'group', 'aria-label': '路線' }, ['CRS2', 'CARF', 'INTEG'].map(routeTile)),
    h('button', { type: 'button', class: 'hero', onclick: () => nav('#/tonight') },
      h('span', { class: 'hero-t' }, '今晚一局'),
      h('span', { class: 'hero-s' }, tl ? `${kindLabel(tl.kind)} · ${tl.title}` : '揀時長開一節'),
      h('span', { class: 'hero-x' }, nightDone ? '✓ 今晚已打卡 · 再玩一節' : '5／15／30 分鐘或自訂'),
      h('span', { class: 'hero-play', 'aria-hidden': 'true' }, icon('play', 26))),
    h('div', { class: 'grid4' },
      tile('#/games', 'games', 'c-games', '遊戲中心', `${D.levels.items.filter(inTrack(route())).length} 關 · 8 款玩法`),
      tile('#/map', 'map', 'c-map', '知識地圖', `${mastered}/${els.length} 點已掌握`),
      tile('#/case', 'case', 'c-case', '大案進度', caseC ? `${actsDone}/${caseC.acts.length} 幕` : '進度環'),
      tile('#/news', 'news', 'c-news', '新例速遞', `${D.news.items.length} 則 · 時間表`, newsN || logN ? h('span', { class: 'dot' }, newsN ? `${newsN} 新` : '更新') : null)),
    h('button', { type: 'button', class: 'tile wide c-badge', onclick: () => nav('#/badges') },
      h('span', { class: 'tile-ic' }, icon('badge', 24)),
      h('span', { class: 'wide-main' }, h('span', { class: 'tile-t' }, '徽章分數'), h('span', { class: 'tile-s' }, `${earned.length}/${D.badges.items.length} 徽章 · 最高連勝 ${P.streakBest || 0}`)),
      h('span', { class: 'medals' }, D.badges.items.slice(0, 3).map((b) => h('span', { class: 'mini-medal' + (badgeEarned(D, b, P) ? ' on' : '') }, icon(badgeEarned(D, b, P) ? 'badge' : 'lock', 16)))))));
}
function streakDays() {
  let n = 0; const d = new Date();
  for (;;) { if (P.nights[dayKey(d)] != null) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}

// ================= TONIGHT / SESSION PICKER =================
let pick = { mins: 5, custom: 45, seed: Date.now() % 1e6 };
export function renderTonight(root) {
  const r = route();
  const tl = tonightLevel(D, r, new Date(), P);
  const cap = maxMinutes(D, r);
  if (pick.custom > cap) pick.custom = Math.max(35, Math.floor(cap / 5) * 5);
  const mins = Math.min(pick.mins === 'c' ? pick.custom : pick.mins, cap);
  const firstId = tl && tl.minutes <= sessionPlan(mins).budget ? tl.id : null;
  const q = buildSession(D, { route: r, minutes: mins, seed: pick.seed, firstLevelId: firstId });
  const total = queueMinutes(q);
  root.append(screenHead('今晚一局', { iconName: 'play' }));
  if (P.session && P.session.pos < P.session.queue.length) {
    root.append(h('div', { class: 'resume' }, h('span', null, `未完：${P.session.label}（${P.session.pos}/${P.session.queue.length}）`), btn('繼續', () => nav('#/play'), 'primary small')));
  }
  if (tl) root.append(h('div', { class: 'feature' }, h('span', { class: 'muted small' }, '今晚主打'), levelCard(tl, { onTap: () => detailSheet(tl) })));
  root.append(h('h3', { class: 'sub' }, '揀時長'),
    h('div', { class: 'len-grid' }, [5, 15, 30, 'c'].map((m) => h('button', { type: 'button', class: 'len' + (pick.mins === m ? ' on' : ''), 'aria-pressed': String(pick.mins === m), onclick: () => { pick.mins = m; rerender(); } },
      h('b', null, m === 'c' ? '自訂' : String(m)), h('span', null, m === 'c' ? `${pick.custom} 分鐘` : '分鐘')))));
  if (pick.mins === 'c') {
    root.append(h('div', { class: 'stepper' }, btn('−5', () => { pick.custom = Math.max(35, pick.custom - 5); rerender(); }, 'big', { 'aria-label': '減 5 分鐘' }), h('b', { 'aria-live': 'polite' }, `${pick.custom} 分鐘`), btn('+5', () => { pick.custom = Math.min(cap, pick.custom + 5); rerender(); }, 'big', { 'aria-label': '加 5 分鐘', disabled: pick.custom + 5 > cap })),
      h('p', { class: 'muted small' }, `${TRACK[r].short} 而家最多有約 ${cap} 分鐘唔重複嘅內容。`));
  }
  const TI = { level: 'games', quiz: 'bolt', flash: 'cards', tree: 'tree', news: 'news' };
  const TL = { level: '關卡', quiz: '快答', flash: 'Flashcard', tree: '決策樹', news: '新例' };
  root.append(h('div', { class: 'plan' },
    h('div', { class: 'plan-head' }, h('b', null, `${q.length} 項 · ${total} 分鐘`), btn('換一批', () => { pick.seed = (pick.seed * 31 + 7) % 1e6; rerender(); }, 'small ghost')),
    h('div', { class: 'plan-strip', 'aria-hidden': 'true' }, q.map((x) => h('i', { class: 'k-' + x.t, style: `flex:${x.min}` }))),
    h('ol', { class: 'plan-list' }, q.map((x) => {
      const it = x.t === 'level' ? IX.lv[x.id] : x.t === 'quiz' ? IX.q[x.id] : x.t === 'flash' ? IX.fc[x.id] : x.t === 'tree' ? IX.tree[x.id] : IX.news[x.id];
      return h('li', { class: 'k-' + x.t }, icon(TI[x.t], 18), h('span', { class: 'pl-t' }, x.t === 'level' ? `${kindLabel(it.kind)}：${it.title}` : TL[x.t]), h('span', { class: 'pl-m' }, `${x.min}′`));
    }))),
    btn(`開始（${total} 分鐘）`, () => startSession(q, { label: `今晚一局 · ${TRACK[r].short} · ${mins} 分鐘`, target: total, night: true, seed: pick.seed }), 'primary big'));
}
const rerender = () => window.dispatchEvent(new Event('rerender'));

// ================= LEVEL INTRO =================
export function renderLevel(root, id) {
  const L = IX.lv[id];
  if (!L) { root.append(screenHead('關卡'), h('p', null, '搵唔到呢關。')); return; }
  root.append(screenHead(kindLabel(L.kind), { iconName: KIND_ICON[L.kind], showRoute: false }),
    h('div', { class: 'lv-intro' },
      h('span', { class: 'big-ic t-' + L.track }, icon(L.icon || KIND_ICON[L.kind] || 'games', 40)),
      h('h2', null, L.title_long || L.title), h('p', { class: 'lead' }, L.short),
      h('div', { class: 'chip-row' }, h('span', { class: 'tag t-' + L.track }, trackName(L.track)), h('span', { class: 'tag' }, '★'.repeat(L.difficulty)), ...L.roles.map((r0) => h('span', { class: 'tag' }, (D.levels.role_labels || {})[r0] || r0)), ...statusChips(L)),
      P.best[L.id] >= 0 ? h('p', { class: 'muted' }, `最佳 ${P.best[L.id]} 分`) : null,
      h('div', { class: 'el-chips' }, L.element_ids.map((e) => IX.el[e] ? h('button', { type: 'button', class: 'chip', onclick: () => elementSheet(IX.el[e]) }, IX.el[e].title) : null)),
      L.detail || (L.quotes || []).length ? btn('玩法／詳情', () => detailSheet(L), 'ghost') : null,
      btn('開始 ▶', () => playOne('level', L.id), 'primary big')));
}

// ================= GAMES HUB =================
export function renderGames(root, sub) {
  const r = route();
  if (sub && KIND_ICON[sub]) {
    root.append(screenHead(kindLabel(sub), { iconName: KIND_ICON[sub] }));
    const ls = D.levels.items.filter((l) => l.kind === sub && l.track === r);
    root.append(ls.length ? h('div', { class: 'list' }, ls.map((l) => levelCard(l))) : h('p', { class: 'muted' }, `${TRACK[r].short} 未有呢款關卡，試下第二條路線。`));
    return;
  }
  root.append(screenHead('遊戲中心', { iconName: 'games' }));
  const cnt = (k) => D.levels.items.filter((l) => l.kind === k && l.track === r).length;
  const t = (hash, ic, title, sub2, cls = '') => h('button', { type: 'button', class: 'gtile ' + cls, onclick: () => nav(hash) }, h('span', { class: 'gt-ic' }, icon(ic, 26)), h('b', null, title), h('span', null, sub2));
  root.append(h('h3', { class: 'sub' }, '8 款玩法'),
    h('div', { class: 'ggrid' }, Object.keys(KIND_ICON).map((k) => t('#/games/' + k, KIND_ICON[k], kindLabel(k), `${cnt(k)} 關`, cnt(k) ? '' : 'dim'))),
    h('h3', { class: 'sub' }, '更多模式'),
    h('div', { class: 'ggrid' },
      t('#/challenge', 'bolt', '計分挑戰', '限時 · 連勝倍數'),
      t('#/adventure', 'route', '情境冒險', `${(D.quiz.adventure || []).length} 關`),
      t('#/bank', 'search', '題庫', `${D.quiz.items.filter((q) => q.track === r).length} 題`),
      t('#/mini', 'checklist', '小測驗', `每組 ${Math.min(MINI_N, D.quiz.items.filter((q) => q.track === r).length)} 題`),
      t('#/flash', 'cards', 'Flashcards', `${D.flashcards.items.filter((f) => f.track === r).length} 張`),
      t('#/trees', 'tree', '決策樹', `${D.trees.items.filter((x) => r === 'INTEG' || x.track === r).length} 棵`),
      t('#/roles', 'people', '角色 × 行業', `${D.roles.items.length} 角色`),
      t('#/compare', 'venn', '兩制比較', 'Venn + 對照表')));
}

// ================= ROLES x INDUSTRIES =================
let roleSel = { role: 'r1', ind: 'all' };
export function renderRoles(root) {
  root.append(screenHead('角色 × 行業', { iconName: 'people' }));
  const role = IX.role[roleSel.role];
  root.append(h('h3', { class: 'sub' }, '角色'), chips(D.roles.items.map((x) => [x.id, x.label || x.title]), roleSel.role, (v) => { roleSel.role = v; rerender(); }),
    role ? h('button', { type: 'button', class: 'info-line', onclick: () => detailSheet(role) }, icon('info', 18), h('span', null, role.title)) : null,
    h('h3', { class: 'sub' }, '行業'), chips(D.industries.items.map((x) => [x.id, x.title]), roleSel.ind, (v) => { roleSel.ind = v; rerender(); }));
  const ls = D.levels.items.filter((l) => l.track === route() && l.roles.includes(roleSel.role) && (roleSel.ind === 'all' || l.industries.includes(roleSel.ind) || l.industries.includes('all')));
  root.append(h('h3', { class: 'sub' }, `${ls.length} 關（${TRACK[route()].short}）`), ls.length ? h('div', { class: 'list' }, ls.map((l) => levelCard(l))) : h('p', { class: 'muted' }, '呢個組合未有關卡，試下第二條路線或行業。'),
    btn('睇角色職責圖', () => nav('#/map/dg-roles'), 'ghost'));
}

// ================= TREES =================
export function treeWalker(t, st, onDone, onNext) {
  const wrap = h('div', { class: 'tree' });
  if (!st.node) { st.node = t.start; st.path = [t.start]; }
  const paint = () => {
    wrap.replaceChildren();
    const n = t.nodes.find((x) => x.id === st.node); const res = t.results.find((x) => x.id === st.node);
    wrap.append(h('div', { class: 'flow-card' }, treeFlow(t, st.path, st.node)));
    if (n) {
      wrap.append(h('div', { class: 'tq pop' }, h('span', { class: 'muted small' }, `第 ${st.path.length} 步`), h('p', { class: 'q' }, n.q),
        n.hint ? h('button', { type: 'button', class: 'tag tag-info', onclick: () => sheet('提示', h('p', { class: 'pre' }, n.hint)) }, '提示') : null),
      h('div', { class: 'yn' }, btn('是', () => { st.node = n.yes; st.path.push(n.yes); paint(); }, 'primary big'), btn('否', () => { st.node = n.no; st.path.push(n.no); paint(); }, 'big')));
    } else if (res) {
      if (onDone && !st.fin) { st.fin = 1; onDone(); }
      wrap.append(h('div', { class: 'fb tone-' + res.tone + ' pop' }, h('b', null, res.verdict), h('p', { class: 'pre' }, res.why), srcLink(res.source_id || res.src)),
        h('div', { class: 'row-btns' }, btn('再行一次', () => { st.node = t.start; st.path = [t.start]; st.fin = 0; paint(); }, 'big'), onNext ? btn('下一個 ›', onNext, 'primary big') : null));
    }
    if (st.path.length > 1 && n) wrap.append(btn('‹ 上一步', () => { st.path.pop(); st.node = st.path[st.path.length - 1]; paint(); }, 'small ghost'));
  };
  paint();
  return wrap;
}
const treeState = {};
export function renderTrees(root) {
  root.append(screenHead('決策樹', { iconName: 'tree' }));
  const ts = D.trees.items.filter((x) => route() === 'INTEG' || x.track === route());
  ts.forEach((t) => {
    const st = treeState[t.id] || (treeState[t.id] = {});
    root.append(h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', null, t.title), h('div', { class: 'chip-row' }, h('span', { class: 'tag t-' + t.track }, trackName(t.track)), ...statusChips(t), h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(t) }, '說明'))),
      treeWalker(t, st, () => { P.trees[t.id] = (P.trees[t.id] || 0) + 1; save(); })));
  });
}

// ================= FLASHCARDS =================
let fcPos = 0; let fcFlip = false;
export function renderFlash(root) {
  root.append(screenHead('Flashcards', { iconName: 'cards' }));
  const fs = D.flashcards.items.filter((f) => f.track === route());
  if (!fs.length) { root.append(h('p', { class: 'muted' }, '呢條路線未有 flashcard。')); return; }
  fcPos = Math.min(fcPos, fs.length - 1);
  const f = fs[fcPos]; const known = fs.filter((x) => P.flash[x.id]).length;
  root.append(h('div', { class: 'progress-line' }, bar((100 * known) / fs.length, 'var(--ok)'), h('span', null, `識咗 ${known}/${fs.length}`)),
    h('button', { type: 'button', class: 'flash' + (fcFlip ? ' back' : ''), onclick: () => { fcFlip = !fcFlip; rerender(); } },
      h('span', { class: 'flash-side' }, `${fcPos + 1}/${fs.length} · ${fcFlip ? '答案' : '問題'}`), h('span', { class: 'flash-t pre' }, fcFlip ? f.back : f.front), h('span', { class: 'muted small' }, fcFlip ? '撳返轉' : '撳一下揭答案')),
    h('div', { class: 'chip-row' }, ...statusChips(f), P.flash[f.id] ? h('span', { class: 'tag tag-ok' }, '識咗') : null),
    h('div', { class: 'row-btns' }, btn('‹ 上一張', () => { fcPos = (fcPos - 1 + fs.length) % fs.length; fcFlip = false; rerender(); }, 'big'), btn(P.flash[f.id] ? '標做未識' : '識咗 ✓', () => { P.flash[f.id] = !P.flash[f.id]; save(); rerender(); }, 'big'), btn('下一張 ›', () => { fcPos = (fcPos + 1) % fs.length; fcFlip = false; rerender(); }, 'primary big')),
    btn('來源', () => detailSheet(f), 'small ghost'));
}

// ================= MINI QUIZ =================
const miniSel = {}; const MINI_N = 8; const miniRound = {};
function miniSet(r) {
  // the track's 'mini' questions always, topped up to MINI_N from the rest of the track (new batch items included); re-rolled on 換一組
  const key = r + ':' + (miniRound[r] || 0);
  if (miniRound.key !== key) {
    const fixed = D.quiz.items.filter((q) => q.set === 'mini' && q.track === r);
    const rest = shuffle(D.quiz.items.filter((q) => q.set !== 'mini' && q.track === r), rng(((miniRound[r] || 0) + 1) * 7919 + dayKey().length));
    miniRound.key = key; miniRound.ids = fixed.concat(rest).slice(0, Math.max(MINI_N, fixed.length)).map((q) => q.id);
  }
  return miniRound.ids.map((id) => IX.q[id]).filter(Boolean);
}
export function renderMini(root) {
  root.append(screenHead('小測驗', { iconName: 'checklist' }));
  const qs = miniSet(route());
  const answered = qs.filter((q) => miniSel[q.id] != null); const good = answered.filter((q) => miniSel[q.id] === q.answer).length;
  root.append(h('div', { class: 'progress-line' }, bar(qs.length ? (100 * answered.length) / qs.length : 0, 'var(--games)'), h('span', null, `已答 ${answered.length}/${qs.length} · 啱 ${good}`)));
  if (!qs.length) root.append(h('p', { class: 'muted' }, '呢條路線未有小測驗題目。'));
  qs.forEach((q, i) => root.append(h('section', { class: 'panel' }, h('span', { class: 'muted small' }, `第 ${i + 1} 題`), mcqBody(q, miniSel[q.id], (k) => { miniSel[q.id] = k; const a = P.qa[q.id] || [0, 0]; P.qa[q.id] = [a[0] + (k === q.answer ? 1 : 0), a[1] + 1]; (q.element_ids || []).forEach((e) => { const o = P.qs[e] || [0, 0]; P.qs[e] = [o[0] + (k === q.answer ? 1 : 0), o[1] + 1]; }); save(); rerender(); }))));
  root.append(h('div', { class: 'row-btns' }, answered.length ? btn('重新做', () => { qs.forEach((q) => delete miniSel[q.id]); rerender(); }, 'ghost') : null,
    btn('換一組題目', () => { qs.forEach((q) => delete miniSel[q.id]); miniRound[route()] = (miniRound[route()] || 0) + 1; rerender(); window.scrollTo(0, 0); }, 'ghost')));
}

// ================= QUESTION BANK =================
let bank = { topic: '', diff: 0, set: '', fmt: '', cur: null, sel: null, show: 30 };
export function renderBank(root) {
  root.append(screenHead('題庫', { iconName: 'search' }));
  const all = D.quiz.items.filter((q) => q.track === route());
  const topics = [...new Set(all.map((q) => q.topic).filter(Boolean))];
  const fmts = [...new Set(all.map((q) => q.format).filter(Boolean))];
  const sets = [...new Set(all.map((q) => q.set).filter(Boolean))]; // items without a set stay under 全部 only
  const SETN = { quickfire: '快答', mini: '小測', bank: '題庫', integ: '一併' };
  const f = all.filter((q) => (!bank.topic || q.topic === bank.topic) && (!bank.diff || q.difficulty === bank.diff) && (!bank.set || q.set === bank.set) && (!bank.fmt || q.format === bank.fmt));
  const filt = h('details', { class: 'filters', open: !bank.cur },
    h('summary', null, icon('search', 18), `篩選（${f.length}/${all.length} 題）`),
    h('h3', { class: 'sub' }, '主題'), chips([['', '全部'], ...topics.map((t) => [t, t])], bank.topic, (v) => { bank.topic = v; bank.show = 30; rerender(); }),
    h('h3', { class: 'sub' }, '難度'), chips([[0, '全部'], [1, '★'], [2, '★★'], [3, '★★★']], bank.diff, (v) => { bank.diff = v; rerender(); }),
    h('h3', { class: 'sub' }, '題型'), chips([['', '全部'], ...fmts.map((t) => [t, t])], bank.fmt, (v) => { bank.fmt = v; rerender(); }),
    h('h3', { class: 'sub' }, '題組'), chips([['', '全部'], ...sets.map((t) => [t, SETN[t] || t])], bank.set, (v) => { bank.set = v; rerender(); }));
  root.append(filt, btn('🎲 隨機抽一題', () => { if (!f.length) return; bank.cur = f[Math.floor(Math.random() * f.length)].id; bank.sel = null; rerender(); window.scrollTo(0, 0); }, 'primary big', { disabled: !f.length }));
  if (bank.cur && IX.q[bank.cur]) {
    const q = IX.q[bank.cur];
    root.append(h('section', { class: 'panel' }, mcqBody(q, bank.sel, (k) => { bank.sel = k; const a = P.qa[q.id] || [0, 0]; P.qa[q.id] = [a[0] + (k === q.answer ? 1 : 0), a[1] + 1]; (q.element_ids || []).forEach((e) => { const o = P.qs[e] || [0, 0]; P.qs[e] = [o[0] + (k === q.answer ? 1 : 0), o[1] + 1]; }); save(); rerender(); }),
      h('div', { class: 'row-btns' }, btn('收埋', () => { bank.cur = null; rerender(); }, 'small ghost'))));
  }
  root.append(h('div', { class: 'list' }, f.slice(0, bank.show).map((q) => {
    const a = P.qa[q.id];
    return card({ ...q, short: '' }, { iconName: 'bolt', meta: `${q.topic || SETN[q.set] || ''} · ${'★'.repeat(q.difficulty)}${a ? ` · 答過 ${a[1]} 次` : ''}`, onTap: () => { bank.cur = q.id; bank.sel = null; rerender(); window.scrollTo(0, 0); } });
  })));
  if (f.length > bank.show) root.append(btn(`顯示多 30 題（仲有 ${f.length - bank.show}）`, () => { bank.show += 30; rerender(); }, 'ghost'));
}

// ================= CHALLENGE =================
let ch = { tier: 1, topic: '', run: null };
const CH_SECS = 25; const CH_UNLOCK = 1500;
const chKey = (t) => route() + ':' + t;
const tierOpen = (t) => t === 1 || (P.chal[chKey(t - 1)] || 0) >= CH_UNLOCK;
export function renderChallenge(root) {
  root.append(screenHead('計分挑戰', { iconName: 'bolt' }));
  const run = ch.run;
  if (!run) {
    const all = D.quiz.items.filter((q) => q.track === route());
    const topics = [...new Set(all.map((q) => q.topic).filter(Boolean))];
    root.append(h('p', { class: 'hint' }, `每局最多 10 題，每題 ${CH_SECS} 秒。快啲答、連勝越多分越高。一個難度達 ${CH_UNLOCK} 分解鎖下一級。`),
      h('div', { class: 'tiers' }, [1, 2, 3].map((t) => h('button', { type: 'button', class: 'tier' + (ch.tier === t ? ' on' : '') + (tierOpen(t) ? '' : ' locked'), disabled: !tierOpen(t), onclick: () => { ch.tier = t; rerender(); } },
        icon(tierOpen(t) ? 'bolt' : 'lock', 22), h('b', null, ['基礎', '進階', '專家'][t - 1]), h('span', null, `最高 ${P.chal[chKey(t)] || 0}`)))),
      h('h3', { class: 'sub' }, '主題'), chips([['', '全部'], ...topics.map((t) => [t, t])], ch.topic, (v) => { ch.topic = v; rerender(); }),
      btn('開始挑戰', () => {
        const pool = all.filter((q) => q.difficulty === ch.tier && (!ch.topic || q.topic === ch.topic));
        const qs = shuffle(pool, rng(Date.now() % 1e6)).slice(0, 10);
        if (!qs.length) { toast('呢個組合冇題目'); return; }
        ch.run = { qs: qs.map((q) => q.id), i: 0, sel: null, left: CH_SECS, pts: 0, streak: 0, max: 0, good: 0 }; rerender();
      }, 'primary big'));
    return;
  }
  clearInterval(run.timer);
  if (run.i >= run.qs.length) {
    const k = chKey(ch.tier); const best = Math.max(P.chal[k] || 0, run.pts); const isBest = run.pts > (P.chal[k] || 0);
    P.chal[k] = best; if (run.max > (P.streakBest || 0)) P.streakBest = run.max; if (!run.counted) { P.points = (P.points || 0) + Math.round(run.pts / 10); run.counted = 1; } save();
    root.append(h('div', { class: 'summary' }, h('div', { class: 'sum-hero pop' }, icon('bolt', 48), h('h1', null, String(run.pts)), h('p', null, `${run.good}/${run.qs.length} 啱 · 最長連勝 ${run.max}${isBest ? ' · 新紀錄！' : ''}`)),
      best >= CH_UNLOCK && ch.tier < 3 ? h('p', { class: 'tag tag-ok' }, '已解鎖下一級') : null,
      h('div', { class: 'row-btns' }, btn('再嚟', () => { ch.run = null; rerender(); }, 'primary big'), btn('返遊戲中心', () => { ch.run = null; nav('#/games'); }, 'big'))));
    return;
  }
  const q = IX.q[run.qs[run.i]];
  const answer = (i) => {
    if (run.sel != null) return; clearInterval(run.timer); run.sel = i;
    if (i === q.answer) { run.pts += Math.round((100 + run.left * 10) * Math.min(1 + 0.5 * run.streak, 3)); run.streak++; run.max = Math.max(run.max, run.streak); run.good++; } else run.streak = 0;
    const a = P.qa[q.id] || [0, 0]; P.qa[q.id] = [a[0] + (i === q.answer ? 1 : 0), a[1] + 1]; save(); rerender();
  };
  const top = h('div', { class: 'quick-top' }, ring((100 * run.left) / CH_SECS, { size: 54, color: run.left <= 5 ? 'var(--bad)' : 'var(--carf)', label: String(run.left) }), h('div', null, h('b', null, `${run.i + 1}/${run.qs.length}`), h('span', null, `得分 ${run.pts} · 連勝 ×${Math.min(1 + 0.5 * run.streak, 3)}`)));
  root.append(top, mcqBody(q, run.sel, answer));
  if (run.sel != null) root.append(btn(run.i + 1 < run.qs.length ? '下一題' : '睇結果', () => { run.i++; run.sel = null; run.left = CH_SECS; rerender(); }, 'primary big'));
  else run.timer = setInterval(() => {
    if (!top.isConnected) { clearInterval(run.timer); return; }
    run.left--; if (run.left <= 0) { run.left = 0; answer(-2); return; }
    top.firstChild.replaceWith(ring((100 * run.left) / CH_SECS, { size: 54, color: run.left <= 5 ? 'var(--bad)' : 'var(--carf)', label: String(run.left) }));
  }, 1000);
  root.append(btn('放棄', () => { clearInterval(run.timer); ch.run = null; rerender(); }, 'small ghost'));
}

// ================= ADVENTURE =================
let adv = { run: null };
export function renderAdventure(root) {
  root.append(screenHead('情境冒險', { iconName: 'route' }));
  const levels = (D.quiz.adventure || []).filter((a) => route() === 'INTEG' || a.track === route());
  const allLv = D.quiz.adventure || [];
  const open = (a) => { const i = allLv.indexOf(a); return i === 0 || (P.adv[allLv[i - 1].id] || 0) >= 1 || allLv[i - 1].track !== a.track; };
  const run = adv.run;
  if (!run) {
    root.append(h('div', { class: 'adv-path' }, levels.map((a, i) => {
      const stars = P.adv[a.id] || 0; const ok = open(a);
      return h('button', { type: 'button', class: 'adv-node' + (ok ? '' : ' locked') + (stars ? ' done' : ''), disabled: !ok, onclick: () => {
        const r = rng(Date.now() % 1e6); const ids = shuffle(a.quiz_ids.filter((id) => IX.q[id]), r);
        adv.run = { id: a.id, qs: ids.slice(0, 6), spare: ids.slice(6), i: 0, sel: null, good: 0, rem: null, remSel: null }; rerender();
      } }, h('span', { class: 'adv-dot t-' + a.track }, ok ? String(i + 1) : icon('lock', 18)), h('span', { class: 'adv-main' }, h('b', null, a.title), h('span', null, a.role)), h('span', { class: 'adv-stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)));
    })), h('p', { class: 'muted small' }, '每關抽 6 題。答錯會出「後果」同一題補救題。答啱一半或以上解鎖下一關。'));
    return;
  }
  const a = IX.adv[run.id];
  if (run.i === 0 && !run.sceneSeen) {
    root.append(h('div', { class: 'scene pop' }, h('span', { class: 'muted small' }, a.role), h('h2', null, a.title), h('p', { class: 'pre' }, a.scene)), btn('開始', () => { run.sceneSeen = 1; rerender(); }, 'primary big'));
    return;
  }
  if (run.i >= run.qs.length) {
    const stars = run.good >= 5 ? 3 : run.good >= 4 ? 2 : run.good >= 3 ? 1 : 0;
    if (!run.saved) { run.saved = 1; P.adv[a.id] = Math.max(P.adv[a.id] || 0, stars); P.points = (P.points || 0) + run.good * 10; save(); }
    root.append(h('div', { class: 'summary' }, h('div', { class: 'sum-hero pop' }, h('div', { class: 'stars' }, [0, 1, 2].map((i) => icon('star', 34, i < stars ? 'on' : ''))), h('h1', null, `${run.good}/${run.qs.length}`), h('p', null, stars ? '過關！' : '未過關，再試一次')),
      btn('返地圖', () => { adv.run = null; rerender(); }, 'primary big')));
    return;
  }
  const q = IX.q[run.qs[run.i]];
  root.append(h('div', { class: 'progress-line' }, bar((100 * run.i) / run.qs.length, 'var(--games)'), h('span', null, `${a.title} · ${run.i + 1}/${run.qs.length}`)));
  root.append(mcqBody(q, run.sel, (k) => { run.sel = k; if (k === q.answer) run.good++; else { const rem = run.spare.find((id) => IX.q[id].topic === q.topic) || run.spare[0]; run.rem = rem || null; run.spare = run.spare.filter((x) => x !== rem); } rerender(); }));
  if (run.sel != null && run.sel !== q.answer) {
    const cons = (D.quiz.consequences || {})[q.topic];
    if (cons) root.append(h('div', { class: 'fb tone-warning' }, h('b', null, '後果'), h('p', null, cons)));
    if (run.rem && IX.q[run.rem]) root.append(h('section', { class: 'panel' }, h('h3', { class: 'sub' }, '補救題'), mcqBody(IX.q[run.rem], run.remSel, (k) => { run.remSel = k; rerender(); })));
  }
  const canNext = run.sel != null && (run.sel === q.answer || !run.rem || run.remSel != null);
  if (canNext) root.append(btn(run.i + 1 < run.qs.length ? '下一題' : '睇結果', () => { run.i++; run.sel = null; run.rem = null; run.remSel = null; rerender(); }, 'primary big'));
  root.append(btn('離開', () => { adv.run = null; rerender(); }, 'small ghost'));
}

// ================= COMPARE =================
export function renderCompare(root) {
  root.append(screenHead('兩制比較', { iconName: 'venn', showRoute: false }));
  D.comparison.items.forEach((c) => {
    root.append(h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', null, c.title), h('div', { class: 'chip-row' }, ...statusChips(c), h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(c) }, '說明'))),
      c.venn ? venn(c.venn, (set) => sheet(set.label, h('ul', { class: 'plain' }, set.items.map((x) => h('li', null, x))))) : null));
    root.append(h('h3', { class: 'sub' }, '逐項對照'), h('div', { class: 'list' }, (c.rows || []).map((rw) => h('button', { type: 'button', class: 'card', onclick: () => sheet(rw.topic,
      h('div', { class: 'cmp2' }, h('div', { class: 'cmp-c c-crs' }, h('b', null, 'CRS 2.0'), h('p', { class: 'pre' }, rw.crs2)), h('div', { class: 'cmp-c c-carf' }, h('b', null, 'CARF'), h('p', { class: 'pre' }, rw.carf))),
      h('p', { class: 'lead' }, rw.relation), h('div', { class: 'srcs' }, (rw.sources || []).map((x) => srcLink(x))),
      rw.element_id && IX.el[rw.element_id] ? btn('睇知識點', () => elementSheet(IX.el[rw.element_id]), 'ghost') : null) },
    h('span', { class: 'card-ic t-INTEG' }, icon('swap')), h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, rw.topic), h('span', { class: 'card-short' }, rw.relation)), h('span', { class: 'card-go' }, '›')))));
    if (c.legacy_table) root.append(h('details', { class: 'more' }, h('summary', null, '原本嘅三欄比較表'), tableEl(c.legacy_table.columns, c.legacy_table.rows)));
  });
}
function tableEl(cols, rows) {
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, cols.map((c) => h('th', null, c)))), h('tbody', null, rows.map((r0) => h('tr', null, r0.map((c, i) => h(i ? 'td' : 'th', null, linkify(String(c)))))))));
}
function linkify(t) {
  const parts = t.split(/(https?:\/\/[^\s，。；）)]+)/g);
  return parts.map((p) => (/^https?:\/\//.test(p) ? h('a', { href: p, target: '_blank', rel: 'noopener noreferrer', class: 'inl' }, p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42) + (p.length > 50 ? '…' : '')) : p));
}

// ================= MAP & FRAMEWORKS =================
const MAP_TABS = [['map', '知識地圖'], ['dg-legal', '法律框架'], ['dg-programme', '合規計劃'], ['dg-roles', '角色']];
export function renderMap(root, sub) {
  const tab = sub && IX.dg[sub] && !sub.startsWith('dg-map') ? sub : 'map';
  root.append(screenHead('知識地圖', { iconName: 'map', showRoute: tab === 'map', right: h('button', { type: 'button', class: 'icon-btn sq', onclick: () => nav('#/glossary'), 'aria-label': '詞彙表' }, icon('abc', 20)) }));
  root.append(seg(MAP_TABS, tab, (v) => nav(v === 'map' ? '#/map' : '#/map/' + v), 'tabs'));
  const W = Math.min(window.innerWidth - 32, 900); const per = W >= 700 ? 5 : W >= 520 ? 4 : 3;
  if (tab === 'map') {
    const dg = IX.dg['dg-map-' + route().toLowerCase()] || D.diagrams.items.find((d) => d.track === route() && d.id.startsWith('dg-map'));
    if (!dg) { root.append(h('p', null, '未有知識地圖。')); return; }
    const groups = [...new Set(dg.nodes.map((n) => n.group))];
    const nodes = dg.nodes.map((n) => { const m = n.element_id ? mastery(D, n.element_id, P).m : -1; return { ...n, row: n.group, state: m >= 60 ? 'ok' : m >= 0 ? 'mid' : 'off', badge: m >= 0 ? String(m) : '', dot: n.element_id && isNewItem(n.element_id), m }; });
    const col = (n) => (n.m >= 60 ? 'var(--ok)' : n.m >= 0 ? 'var(--crs)' : 'var(--node-off)');
    root.append(h('div', { class: 'diagram-card' },
      h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--ok)' }), '已掌握'), h('span', null, h('i', { style: 'background:var(--crs)' }), '學緊'), h('span', null, h('i', { style: 'background:var(--node-off)' }), '未開始'), h('span', null, h('i', { class: 'rd' }), '有更新')),
      layeredGraph({ nodes, edges: dg.edges, rows: groups.map((g) => ({ key: g, label: g })), perRow: per, width: Math.max(340, W), onNode: (n) => n.element_id && IX.el[n.element_id] && elementSheet(IX.el[n.element_id]), colorOf: col, ariaLabel: dg.title })),
      h('div', { class: 'chip-row' }, ...statusChips(dg), h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(dg) }, '說明')),
      (dg.external_edges || []).length ? h('details', { class: 'more' }, h('summary', null, `連去其他路線（${dg.external_edges.length}）`), h('div', { class: 'el-chips' }, dg.external_edges.map((e) => IX.el[e.to] ? h('button', { type: 'button', class: 'chip t-' + IX.el[e.to].track, onclick: () => elementSheet(IX.el[e.to]) }, IX.el[e.to].title) : null))) : null);
    groups.forEach((g) => {
      root.append(h('h3', { class: 'sub' }, g), h('div', { class: 'list' }, dg.nodes.filter((n) => n.group === g).map((n) => {
        const el = IX.el[n.element_id]; if (!el) return null; const m = mastery(D, el.id, P);
        return card(el, { onTap: () => elementSheet(el), meta: m.m >= 0 ? `掌握 ${m.m}%` : `${m.total} 關`, right: m.m >= 0 ? ring(m.m, { size: 40, stroke: 5, color: m.m >= 60 ? 'var(--ok)' : 'var(--crs)' }) : null });
      })));
    });
    return;
  }
  const dg = IX.dg[tab];
  const isLayer = !!dg.layers;
  const rows = isLayer ? Object.keys(dg.layers).sort((a, b) => a - b).map((k) => ({ key: Number(k), label: dg.layers[k] })) : [...new Set(dg.nodes.map((n) => n.group))].map((g) => ({ key: g, label: g }));
  const nodes = dg.nodes.map((n) => ({ ...n, row: isLayer ? Number(n.layer) : n.group }));
  root.append(h('div', { class: 'diagram-card' }, h('p', { class: 'muted small' }, dg.short),
    layeredGraph({ nodes, edges: dg.edges, rows, style: 'box', edgeLabels: false, perRow: Math.min(per, 3) + (W >= 700 ? 1 : 0), width: Math.max(340, W), ariaLabel: dg.title,
      colorOf: (n) => (n.element_id && IX.el[n.element_id] ? TRACK[IX.el[n.element_id].track].color : 'var(--text2)'),
      onNode: (n) => {
        const el = n.element_id && IX.el[n.element_id];
        const ins = dg.edges.filter((e) => e.to === n.id).map((e) => dg.nodes.find((x) => x.id === e.from)).filter(Boolean);
        const outs = dg.edges.filter((e) => e.from === n.id).map((e) => [e, dg.nodes.find((x) => x.id === e.to)]).filter((x) => x[1]);
        sheet(n.label, h('div', { class: 'chip-row' }, h('span', { class: 'tag' }, isLayer ? dg.layers[n.layer] : n.group)),
          ins.length ? h('p', { class: 'muted' }, '上一層：' + ins.map((x) => x.label).join('、')) : null,
          outs.length ? h('ul', { class: 'plain' }, outs.map(([e, x]) => h('li', null, (e.label ? e.label + ' → ' : '→ ') + x.label))) : null,
          el ? btn('睇知識點：' + el.title, () => elementSheet(el), 'ghost') : null);
      } })),
  h('div', { class: 'chip-row' }, ...statusChips(dg), h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(dg) }, '說明同來源')));
}

// ================= CASE / PROGRESS =================
export function renderCase(root) {
  root.append(screenHead('大案進度', { iconName: 'case' }));
  root.append(h('div', { class: 'rings3' }, ['CRS2', 'CARF', 'INTEG'].map((t) => h('button', { type: 'button', class: 'ring-box' + (route() === t ? ' on' : ''), onclick: () => setRoute(t) }, ring(trackPct(D, t, P), { size: 84, stroke: 9, color: TRACK[t].color }), h('b', null, TRACK[t].short), h('span', null, `${trackDone(D, t, P)}/${D.levels.items.filter((l) => l.track === t).length} 關`)))));
  const els = D.elements.items.filter(inTrack(route()));
  const chaps = [...new Set(els.map((e) => e.chapter))];
  root.append(h('h3', { class: 'sub' }, `${TRACK[route()].short} 章節掌握度`), h('div', { class: 'chap-grid' }, chaps.map((c) => {
    const ms = els.filter((e) => e.chapter === c).map((e) => Math.max(0, mastery(D, e.id, P).m));
    const avg = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0;
    return h('button', { type: 'button', class: 'chap', onclick: () => nav('#/map') }, ring(avg, { size: 56, color: TRACK[route()].color }), h('b', null, c), h('span', null, `${ms.length} 點`));
  })));
  D.case.items.forEach((c) => {
    const acts = c.acts;
    root.append(h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', null, c.title), h('div', { class: 'chip-row' }, h('span', { class: 'tag t-' + c.track }, trackName(c.track)), h('span', { class: 'tag' }, `${c.minutes} 分鐘`), ...statusChips(c), h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(c) }, '說明'))),
      h('p', { class: 'muted' }, c.short),
      h('ol', { class: 'acts' }, acts.map((a, i) => {
        const done = caseActDone(c, a, P); const open = i === 0 || caseActDone(c, acts[i - 1], P);
        return h('li', { class: (done ? 'done' : open ? 'open' : 'locked') },
          h('span', { class: 'act-dot' }, done ? icon('check', 18) : open ? String(a.n) : icon('lock', 16)),
          h('div', { class: 'act-main' }, h('b', null, a.title), h('div', { class: 'act-lv' }, a.level_ids.map((id) => IX.lv[id] ? h('button', { type: 'button', class: 'chip' + (P.best[id] >= 0 ? ' on' : ''), disabled: !open, onclick: () => nav('#/level/' + id) }, `${(D.levels.kinds || {})[IX.lv[id].kind] || ''} ${P.best[id] >= 0 ? '✓ ' + P.best[id] : '▶'}`) : null))));
      }))));
  });
}

// ================= NEWS =================
let newsTab = 'news';
export function renderNews(root) {
  root.append(screenHead('新例速遞', { iconName: 'news' }));
  const unseen = unseenLog();
  root.append(seg([['news', `新聞${unreadNews().filter(inInfo(route())).length ? ' •' : ''}`], ['tl', '時間表'], ['log', `更新紀錄${unseen.length ? ' •' : ''}`]], newsTab, (v) => { newsTab = v; rerender(); }, 'tabs'));
  if (newsTab === 'news') {
    root.append(liveLog().filter((e) => e.summary).map((e) => h('button', { type: 'button', class: 'card log upd-banner', onclick: () => { P.seenLog[logKey(e)] = 1; save(); rerender(); logSheet(e); } },
      h('span', { class: 'card-ic ch-' + e.change }, icon('refresh', 20)),
      h('span', { class: 'card-main' }, h('span', { class: 'card-meta' }, `內容更新 · ${e.date}`), h('span', { class: 'card-title' }, e.summary)),
      !P.seenLog[logKey(e)] ? h('span', { class: 'reddot static', 'aria-label': '未睇' }) : h('span', { class: 'card-go' }, '›'))));
    const ns = D.news.items.filter(inInfo(route()));
    root.append(h('div', { class: 'timeline' }, ns.map((n) => h('button', { type: 'button', class: 'tl-item news-card', onclick: () => { P.newsRead[n.id] = true; save(); rerender(); detailSheet(n, ...(n.element_ids || []).map((e) => IX.el[e] ? btn('知識點：' + IX.el[e].title, () => elementSheet(IX.el[e]), 'ghost') : null)); } },
      h('span', { class: 'tl-dot t-' + n.track }), !P.newsRead[n.id] ? h('span', { class: 'reddot', 'aria-label': '未讀' }) : null,
      h('span', { class: 'date' }, n.date), h('b', null, n.title), h('span', { class: 'card-short' }, n.short),
      h('span', { class: 'chip-row' }, h('span', { class: 'tag t-' + n.track }, TRACK[n.track] ? TRACK[n.track].short : n.track), h('span', { class: 'tag st-' + n.status }, n.status === 'enacted' ? '已立法／已公佈' : n.status === 'planned' ? '計劃' : n.status), ...statusChips(n))))),
    unreadNews().length ? btn('全部標為已讀', () => { D.news.items.forEach((n) => { P.newsRead[n.id] = true; }); save(); rerender(); }, 'ghost') : null);
  } else if (newsTab === 'tl') {
    const items = D.timeline.items.filter(inInfo(route())).slice().sort((a, b) => a.date.localeCompare(b.date));
    const today = dayKey();
    root.append(h('div', { class: 'legend' }, h('span', null, h('i', { class: 'k-enacted' }), '已立法'), h('span', null, h('i', { class: 'k-planned' }), '計劃'), h('span', null, h('i', { class: 'k-event' }), '事件')));
    let nowPlaced = false;
    const list = h('div', { class: 'timeline vt' });
    items.forEach((t) => {
      if (!nowPlaced && t.date > today) { nowPlaced = true; list.append(h('div', { class: 'tl-now' }, h('span', null, '今日 ' + today))); }
      list.append(h('button', { type: 'button', class: 'tl-item k-' + t.kind + (t.date < today ? ' past' : ''), onclick: () => detailSheet(t) }, h('span', { class: 'tl-dot' }), h('span', { class: 'date' }, t.date), h('b', null, t.title), h('span', { class: 'chip-row' }, t.nature ? h('span', { class: 'tag' }, t.nature) : null, ...statusChips(t))));
    });
    root.append(list);
  } else {
    const live = liveLog(); const liveSet = new Set(live);
    const older = (D.changelog.entries || []).filter((e) => !liveSet.has(e));
    const CH = { added: '新增', modified: '修改', removed: '刪除' };
    const FL = { provisions: '條文', terms: '定義詞', quotes: '引文', title: '標題', title_long: '長標題', short: '摘要', detail: '詳情', sources: '來源', status: '核實狀態', options: '選項', answer: '答案', explain: '解釋', minutes: '時長', items: '內容', non_statutory: '非法定標記', zh: '中文本', zh_text: '中文本', zh_status: '中文本狀態', acts: '幕', text: '原文' };
    const logCard = (e) => {
      const target = itemById(e.file, e.item_id); const seen = !!P.seenLog[logKey(e)]; const isLive = liveSet.has(e);
      return h('button', { type: 'button', class: 'card log', onclick: () => { P.seenLog[logKey(e)] = 1; save(); rerender(); if (target) openItem(e.file, target); else if (e.file === 'terms.json') nav('#/glossary'); else logSheet(e); } },
        h('span', { class: 'card-ic ch-' + e.change }, icon(e.change === 'added' ? 'star' : e.change === 'removed' ? 'x' : 'refresh', 20)),
        h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, e.summary ? e.summary : `${CH[e.change] || e.change} · ${target ? target.title || target.ref || target.term || e.item_id : e.item_id}`), e.note && e.note !== e.summary ? h('span', { class: 'card-short' }, e.note) : null, e.summary ? h('span', { class: 'card-short' }, `${CH[e.change] || e.change} · ${e.item_id}`) : null,
          (e.fields || []).length ? h('span', { class: 'chip-row' }, e.fields.map((x) => h('span', { class: 'tag tag-field' }, FL[x] || x))) : null,
          h('span', { class: 'card-meta' }, e.file)),
        isLive && !seen ? h('span', { class: 'reddot static', 'aria-label': '未睇' }) : h('span', { class: 'card-go' }, '›'));
    };
    const byDate = (arr) => { const g = {}; arr.forEach((e) => { (g[e.date] = g[e.date] || []).push(e); }); return Object.keys(g).sort().reverse().map((d) => [d, g[d]]); };
    root.append(h('p', { class: 'muted small' }, `內容版本 ${D.meta.content_version} · 最近 ${RECENT_DAYS} 日 ${live.length} 項更新`),
      unseen.length ? btn(`全部標為已讀（${unseen.length}）`, () => { live.forEach((e) => { P.seenLog[logKey(e)] = 1; }); save(); rerender(); }, 'ghost') : null);
    if (!live.length) root.append(h('p', { class: 'muted' }, `最近 ${RECENT_DAYS} 日冇新更新。`));
    byDate(live).forEach(([d, es]) => root.append(h('h3', { class: 'sub' }, d), h('div', { class: 'list' }, es.map(logCard))));
    if (older.length) {
      const box = h('details', { class: 'more' }, h('summary', null, `較早／初版紀錄（${older.length}）`));
      box.addEventListener('toggle', () => { if (box.open && box.children.length === 1) byDate(older).forEach(([d, es]) => box.append(h('h3', { class: 'sub' }, d), h('div', { class: 'list' }, es.map(logCard)))); }, { once: false });
      root.append(box);
    }
  }
}

function logSheet(e) {
  const CH = { added: '新增', modified: '修改', removed: '刪除' };
  sheet(e.summary || e.item_id, h('div', { class: 'chip-row' }, h('span', { class: 'tag' }, e.date), h('span', { class: 'tag' }, CH[e.change] || e.change), h('span', { class: 'tag' }, e.file)),
    e.summary ? h('p', { class: 'lead' }, e.summary) : null, e.note && e.note !== e.summary ? h('p', { class: 'pre' }, e.note) : null,
    (e.fields || []).length ? h('p', { class: 'muted small' }, e.fields.join('、')) : null,
    h('p', { class: 'muted small' }, `內容版本 ${D.meta.content_version}`));
}
function itemById(file, id) {
  const m = { 'levels.json': IX.lv, 'quiz.json': IX.q, 'elements.json': IX.el, 'flashcards.json': IX.fc, 'badges.json': IX.badge, 'news.json': IX.news, 'provisions.json': IX.prov, 'trees.json': IX.tree, 'diagrams.json': IX.dg, 'terms.json': IX.term };
  return m[file] ? m[file][id] : null;
}
function openItem(file, it) {
  if (file === 'levels.json') nav('#/level/' + it.id);
  else if (file === 'elements.json') elementSheet(it);
  else if (file === 'provisions.json') nav('#/reader/' + it.id);
  else if (file === 'terms.json') termSheet(it);
  else if (file === 'quiz.json') sheet(it.title, mcqBody(it, it.answer, () => {}));
  else detailSheet(it);
}

// ================= BADGES =================
export function renderBadges(root) {
  root.append(screenHead('徽章分數', { iconName: 'badge', showRoute: false }));
  const pl = playerLevel();
  const earned = D.badges.items.filter((b) => badgeEarned(D, b, P));
  root.append(h('div', { class: 'score-hero pop' }, ring(pl.pct, { size: 110, stroke: 11, color: 'var(--hero)', label: 'Lv' + pl.lv }), h('div', null, h('b', { class: 'big-num' }, String(pl.pts)), h('span', null, '總分'), h('span', { class: 'muted small' }, `下一級仲差 ${500 - (pl.pts % 500)} 分`))),
    h('div', { class: 'stats' },
      stat('徽章', `${earned.length}/${D.badges.items.length}`), stat('完成關卡', String(Object.keys(P.best).length)), stat('最長連勝', String(P.streakBest || 0)), stat('快答最高', String(P.quickBest || 0)), stat('打卡晚數', String(Object.keys(P.nights).length)), stat('連續打卡', String(streakDays()))),
    h('h3', { class: 'sub' }, '徽章牆'),
    h('div', { class: 'medal-grid' }, D.badges.items.map((b) => {
      const on = badgeEarned(D, b, P);
      return h('button', { type: 'button', class: 'medal' + (on ? ' on' : ''), onclick: () => sheet(b.title, h('p', { class: 'lead' }, b.short), h('p', null, on ? '✓ 已取得' : '未取得'), badgeKnown(b) ? null : h('p', { class: 'uv-note' }, '呢個規則類型 App 未支援：' + JSON.stringify(b.rule)), ...statusChips(b)) },
        h('span', { class: 'medal-ic t-' + b.track }, icon(on ? (b.icon && b.icon !== 'badge' ? b.icon : 'badge') : 'lock', 28)), h('b', null, b.title), h('span', null, b.short));
    })),
    h('h3', { class: 'sub' }, '打卡日曆（近 5 星期）'), nightCalendar(),
    h('h3', { class: 'sub' }, '每款玩法最佳'), h('div', { class: 'kind-bars' }, Object.keys(KIND_ICON).map((k) => {
      const ls = D.levels.items.filter((l) => l.kind === k); const bs = ls.map((l) => P.best[l.id]).filter((x) => x >= 0);
      const best = bs.length ? Math.max(...bs) : 0;
      return h('div', { class: 'kb' }, icon(KIND_ICON[k], 18), h('span', null, kindLabel(k)), bar(best, 'var(--games)'), h('b', null, bs.length ? String(best) : '—'));
    })),
    h('h3', { class: 'sub' }, '計分挑戰最高'), h('div', { class: 'stats' }, ['CRS2', 'CARF', 'INTEG'].flatMap((t) => [1, 2, 3].map((tier) => stat(`${TRACK[t].short} ${['基礎', '進階', '專家'][tier - 1]}`, String(P.chal[t + ':' + tier] || 0))))));
}
const stat = (label, v) => h('div', { class: 'stat' }, h('b', null, v), h('span', null, label));
function nightCalendar() {
  const d = new Date(); d.setDate(d.getDate() - 34);
  const cells = [];
  for (let i = 0; i < 35; i++) { const k = dayKey(d); const v = P.nights[k]; cells.push(h('i', { class: 'cal' + (v != null ? ' on' : ''), title: k + (v != null ? ` · ${v}` : ''), style: v != null ? `opacity:${0.45 + v / 180}` : '' })); d.setDate(d.getDate() + 1); }
  return h('div', { class: 'cal-grid', role: 'img', 'aria-label': `近 35 日打卡 ${cells.filter((c) => c.classList.contains('on')).length} 晚` }, cells);
}

// ================= LIBRARY =================
let libTab = 'prov'; let provFilter = 'track';
export function renderLibrary(root) {
  root.append(screenHead('資料庫', { iconName: 'book', showRoute: libTab === 'prov' || libTab === 'lib' }));
  root.append(seg([['prov', '條文'], ['lib', '資料'], ['src', '來源'], ['uv', '未核實']], libTab, (v) => { libTab = v; rerender(); }, 'tabs'));
  if (libTab === 'prov') {
    root.append(chips([['track', TRACK[route()].short], ['all', '全部'], ['bm', `書籤（${P.bookmarks.length}）`]], provFilter, (v) => { provFilter = v; rerender(); }));
    const ps = D.provisions.items.filter((p) => provFilter === 'all' || (provFilter === 'bm' ? P.bookmarks.includes(p.id) : p.track === route()));
    root.append(h('p', { class: 'muted small' }, `${ps.length} 條 · 全文逐字 · 撳開閱讀`),
      h('div', { class: 'list' }, ps.map((p) => card({ ...p, title: p.ref, short: p.excerpt ? '節錄' : '' }, { iconName: 'gavel', meta: `${p.lang === 'en' ? 'English' : p.lang} · ${p.accessed || ''}${P.bookmarks.includes(p.id) ? ' · 🔖' : ''}`, onTap: () => nav('#/reader/' + encodeURIComponent(p.id)) }))));
    if (!ps.length) root.append(h('p', { class: 'muted' }, provFilter === 'bm' ? '未有書籤。喺條文閱讀器撳書籤。' : '冇條文。'));
  } else if (libTab === 'lib') {
    const ls = D.library.items.filter(inInfo(route()));
    root.append(h('div', { class: 'list' }, ls.map((it) => card(it, { iconName: 'book', onTap: () => sheet(it.title, ...libBlocks(it), ...statusChips(it), sourcesList(it)) }))));
  } else if (libTab === 'src') {
    const byKind = {};
    Object.values(D.sources.items).forEach((x) => { (byKind[x.kind] = byKind[x.kind] || []).push(x); });
    const KN = { law: '法例', ird: 'IRD', oecd: 'OECD', legco: '立法會', industry: '業界' };
    Object.keys(byKind).forEach((k) => root.append(h('details', { class: 'more' }, h('summary', null, `${KN[k] || k}（${byKind[k].length}）`),
      h('div', { class: 'list' }, byKind[k].map((x) => h('a', { class: 'card', href: x.url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: 'card-ic' }, icon('link')), h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, x.title), h('span', { class: 'card-meta' }, `${x.id} · 查閱 ${x.accessed || '—'}${x.link_check ? ` · HTTP ${x.link_check.http}` : ''}`), h('span', { class: 'chip-row' }, ...statusChips(x))), h('span', { class: 'card-go' }, '↗')))))));
  } else {
    root.append(h('h3', { class: 'sub' }, 'UNVERIFIED 清單'), h('div', { class: 'list' }, D.unverified.items.map((u) => h('div', { class: 'card static' }, h('span', { class: 'tag tag-uv' }, u.id), h('span', { class: 'card-main' }, h('span', { class: 'card-short pre' }, u.text), u.applies_to ? h('span', { class: 'card-meta' }, '適用：' + u.applies_to) : null)))),
      h('h3', { class: 'sub' }, `待補充來源位（${D.unverified.pending_slots.length}）`),
      h('div', { class: 'list' }, D.unverified.pending_slots.map((p) => { const el = IX.el[p.element_id]; return h('button', { type: 'button', class: 'card', onclick: () => el && elementSheet(el) }, h('span', { class: 'tag tag-pend' }, '待補充'), h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, el ? el.title : p.element_id), h('span', { class: 'card-meta' }, p.slot_name || p.slot)), h('span', { class: 'card-go' }, '›')); })));
  }
}
function libBlocks(it) {
  return (it.blocks || []).map((b) => {
    const txt = b.text || '';
    if (/\{[a-zA-Z_.]+ \?\?/.test(txt) || (b.props && Object.values(b.props).some((v) => v == null))) return null; // page-template leftovers, see report
    switch (b.type) {
      case 'Subheading': return h('h3', { class: 'sub' }, txt);
      case 'Text': return h('p', { class: 'pre' }, txt);
      case 'Callout': return h('div', { class: 'callout' }, b.lead ? h('b', null, b.lead) : null, h('p', { class: 'pre' }, linkify(txt)));
      case 'Quote': return h('figure', { class: 'quote' }, h('blockquote', { class: 'pre', lang: 'en' }, txt), b.cite ? h('figcaption', null, linkify(b.cite)) : null);
      case 'BulletList': return h('ul', { class: 'plain' }, b.props.items.map((x) => h('li', null, linkify(String(typeof x === 'object' ? x.text || JSON.stringify(x) : x)))));
      case 'Table': return tableEl(b.props.columns, b.props.rows);
      case 'Metrics': return h('div', { class: 'stats' }, b.props.metrics.map((m) => h('div', { class: 'stat' }, h('b', null, m.value), h('span', null, m.label), m.detail ? h('span', { class: 'muted small' }, m.detail) : null)));
      case 'Properties': return h('dl', { class: 'props' }, b.props.items.map((p) => [h('dt', null, p.label), h('dd', null, linkify(String(p.value)))]));
      case 'LinkCards': return h('div', { class: 'list' }, b.props.links.map((l) => h('a', { class: 'card', href: l.href, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: 'card-ic' }, icon('link')), h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, l.title), h('span', { class: 'card-meta' }, [l.site, l.date].filter(Boolean).join(' · '))), h('span', { class: 'card-go' }, '↗'))));
      default: return h('p', { class: 'pre' }, txt || JSON.stringify(b.props || {}));
    }
  });
}

// ================= SETTINGS =================
export function renderSettings(root) {
  root.append(screenHead('設定', { iconName: 'gear', showRoute: false }));
  const m = D.meta;
  const disc = D.library.items.find((x) => x.id === 'lib-unverified');
  const discBlock = disc && disc.blocks.find((b) => b.type === 'Callout' && b.lead === '免責聲明');
  root.append(h('section', { class: 'panel' }, h('h2', null, '字體大小'), seg([[0, '標準'], [1, '大'], [2, '特大']], P.font || 0, (v) => { P.font = v; save(); applyFont(); rerender(); })),
    h('section', { class: 'panel' }, h('h2', null, '內容'), h('dl', { class: 'props' },
      h('dt', null, '內容版本'), h('dd', null, m.content_version), h('dt', null, '生成時間'), h('dd', null, m.generated_at), h('dt', null, '來源檢查'), h('dd', null, m.last_checked || '—'), h('dt', null, 'Schema'), h('dd', null, m.schema_version), h('dt', null, 'App 版本'), h('dd', null, window.__BUILD__ || 'dev'))),
    h('section', { class: 'panel' }, h('h2', null, '進度'), h('p', null, storageOk ? '進度只存喺呢部機（localStorage）。唔會上載。' : '呢個瀏覽器唔俾儲存，進度只限今次。')),
    discBlock ? h('div', { class: 'callout' }, h('b', null, discBlock.lead), h('p', { class: 'pre' }, discBlock.text)) : null,
    h('section', { class: 'panel' }, h('h2', null, '載入有問題？'), h('p', { class: 'muted small' }, '只清 App 程式快取，唔會刪除進度。'), btn('修復並重新載入', () => window.__repair && window.__repair(), 'ghost')));
}
export function applyFont() { document.documentElement.dataset.font = String(P.font || 0); }

// ================= GLOSSARY =================
let gloss = { q: '', scheme: '' };
export function renderGlossary(root) {
  root.append(screenHead('詞彙表', { iconName: 'abc', showRoute: false }));
  const all = D.terms.items.slice().sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const schemes = [...new Set(all.map((t) => t.scheme))];
  const input = h('input', { type: 'search', class: 'search', placeholder: '搵詞（中／英）', 'aria-label': '搵詞', value: gloss.q, autocomplete: 'off' });
  const count = h('p', { class: 'muted small', 'aria-live': 'polite' });
  const rows = all.map((t) => {
    const el = h('button', { type: 'button', class: 'card term-card', onclick: () => termSheet(t) },
      h('span', { class: 'card-main' },
        h('span', { class: 'card-title' }, t.term_zh ? h('span', null, t.term_zh, '　') : null, h('span', { class: 'en' }, t.term)),
        h('span', { class: 'card-meta' }, `${SCHEME[t.scheme] || t.scheme} · ${t.provision_ref}`),
        t.caveat ? h('span', { class: 'caveat one' }, '附註：' + t.caveat) : null,
        h('span', { class: 'chip-row' }, statusChips(t), t.superseded_by ? h('span', { class: 'tag tag-pend' }, '已被取代') : null)),
      h('span', { class: 'card-go', 'aria-hidden': 'true' }, '›'));
    el._hay = [t.term, t.term_zh, t.definition, t.definition_zh, t.provision_ref].filter(Boolean).join('\n').toLowerCase();
    el._scheme = t.scheme;
    return el;
  });
  const list = h('div', { class: 'list' }, rows);
  const apply = () => {
    const q = gloss.q.trim().toLowerCase(); let n = 0;
    rows.forEach((r) => { const ok = (!gloss.scheme || r._scheme === gloss.scheme) && (!q || r._hay.includes(q)); r.hidden = !ok; if (ok) n++; });
    count.textContent = `${n} / ${all.length} 個詞 · 撳睇逐字定義同來源`;
    empty.hidden = n > 0;
  };
  const empty = h('p', { class: 'muted' }, '搵唔到。');
  input.addEventListener('input', () => { gloss.q = input.value; apply(); });
  const chipBox = h('div', { class: 'chips' });
  const drawChips = () => chipBox.replaceChildren(...[['', '全部'], ...schemes.map((x) => [x, SCHEME[x] || x])].map(([v, label]) => h('button', { type: 'button', class: 'chip' + (gloss.scheme === v ? ' on' : ''), 'aria-pressed': String(gloss.scheme === v), onclick: () => { gloss.scheme = v; drawChips(); apply(); } }, label)));
  drawChips();
  root.append(h('div', { class: 'gloss-bar' }, input), chipBox, count, list, empty);
  apply();
}
