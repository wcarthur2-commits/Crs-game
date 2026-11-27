// Session runner and the game engines for every level kind.
import { h, icon, btn, ring, bar, sheet, toast } from './ui.js?v=v7';
import { D, IX, P, save, nav, route, trackName } from './state.js?v=v7';
import { rng, shuffle, score, quickPoints, writeKeywordHits, dayKey, badgeEarned, mastery } from './engine.js?v=v7';
import { srcLink, quoteBlock, detailSheet, statusChips, screenHead, elementSheet, caveatNote } from './common.js?v=v7';
import { treeWalker } from './screens.js?v=v7';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const kindLabel = (k) => (D.levels.kinds || {})[k] || k;

// ---------- session ----------
export function startSession(queue, { label, target, night = false, seed = Date.now() % 1e6 }) {
  P.session = { label, queue, pos: 0, results: [], target, night, seed, startedAt: Date.now(), badgesBefore: earnedIds() };
  save();
  nav('#/play');
}
export function playOne(type, id, label) {
  const item = type === 'level' ? IX.lv[id] : null;
  startSession([{ t: type, id, min: item ? item.minutes : 0.5 }], { label: label || (item ? item.title : ''), target: item ? item.minutes : 0.5 });
}
function earnedIds() { return D.badges.items.filter((b) => badgeEarned(D, b, P)).map((b) => b.id); }

function recordQuiz(q, right) {
  const a = P.qa[q.id] || [0, 0]; P.qa[q.id] = [a[0] + (right ? 1 : 0), a[1] + 1];
  (q.element_ids || []).forEach((e) => { const o = P.qs[e] || [0, 0]; P.qs[e] = [o[0] + (right ? 1 : 0), o[1] + 1]; });
}
function finishItem(item, sc, extra = {}) {
  const ses = P.session; if (!ses) return;
  ses.results.push([item.t + ':' + item.id, sc]);
  if (item.t === 'level') {
    const L = IX.lv[item.id];
    if (!(P.best[L.id] >= sc)) P.best[L.id] = sc;
    if (sc === 100) P.perfect[L.kind] = (P.perfect[L.kind] || 0) + 1;
    if (L.kind === 'story' && extra.zero) P.zeroStory = (P.zeroStory || 0) + 1;
    if (L.kind === 'quiz') { if ((extra.pts || 0) > (P.quickBest || 0)) P.quickBest = extra.pts; }
  }
  if (extra.streak && extra.streak > (P.streakBest || 0)) P.streakBest = extra.streak;
  P.points = (P.points || 0) + sc;
  save();
}

let live = null; // transient state for the current item
export function renderPlay(root) {
  const ses = P.session;
  if (!ses || !ses.queue.length) { root.append(screenHead('一節', { showRoute: false }), h('div', { class: 'empty-cta' }, btn('去今晚一局', () => nav('#/tonight'), 'primary'))); return; }
  if (ses.pos >= ses.queue.length) return renderSummary(root, ses);
  const item = ses.queue[ses.pos];
  const done = ses.results.length > ses.pos;
  const elapsed = ses.queue.slice(0, ses.pos).reduce((a, x) => a + x.min, 0);
  const head = h('header', { class: 'play-head' },
    h('button', { type: 'button', class: 'back', onclick: () => nav('#/home'), 'aria-label': '暫停並返主畫面' }, icon('back', 20), h('span', null, '暫停')),
    h('div', { class: 'play-meta' }, h('b', null, ses.label), h('span', null, `${ses.pos + 1}/${ses.queue.length} · 約 ${elapsed}/${ses.target} 分鐘`)),
    btn('結束', () => { ses.pos = ses.queue.length; save(); window.dispatchEvent(new Event('rerender')); }, 'small ghost'));
  const steps = h('div', { class: 'steps-bar', 'aria-hidden': 'true' }, ses.queue.map((q, i) => h('i', { class: (i < ses.pos ? 'd ' : i === ses.pos ? 'c ' : '') + 'k-' + q.t })));
  const body = h('div', { class: 'play-body' });
  root.append(head, steps, body);
  if (!live || live.key !== ses.seed + ':' + ses.pos) live = { key: ses.seed + ':' + ses.pos };
  const next = () => { ses.pos++; save(); live = null; window.dispatchEvent(new Event('rerender')); window.scrollTo(0, 0); };
  const finish = (sc, extra) => { if (ses.results.length <= ses.pos) finishItem(item, sc, extra); };
  const ctx = { st: live, finish, next, done };
  if (item.t === 'level') playLevel(body, IX.lv[item.id], ctx);
  else if (item.t === 'quiz') playQuizItem(body, IX.q[item.id], ctx);
  else if (item.t === 'flash') playFlash(body, IX.fc[item.id], ctx);
  else if (item.t === 'tree') playTree(body, IX.tree[item.id], ctx);
  else if (item.t === 'news') playNews(body, IX.news[item.id], ctx);
  if (!body.childNodes.length) body.append(h('p', null, '呢項內容已經更新咗，跳過。'), btn('下一個', next, 'primary'));
}

function resultPanel(sc, ctx, extra) {
  const stars = sc >= 90 ? 3 : sc >= 60 ? 2 : sc > 0 ? 1 : 0;
  return h('div', { class: 'result pop' },
    h('div', { class: 'stars', 'aria-label': `${stars} 粒星` }, [0, 1, 2].map((i) => icon('star', 30, i < stars ? 'on' : ''))),
    h('div', { class: 'result-score' }, h('b', null, String(sc)), h('span', null, '分')),
    extra || null,
    btn('下一個 ›', ctx.next, 'primary big'));
}
function levelHead(L) {
  return h('div', { class: 'lv-head' },
    h('span', { class: 'lv-kind t-' + L.track }, icon(L.icon || 'games', 18), kindLabel(L.kind)),
    h('h2', { class: 'lv-title' }, L.title_long || L.title),
    h('div', { class: 'chip-row' }, h('span', { class: 'tag t-' + L.track }, trackName(L.track)), h('span', { class: 'tag' }, `${L.minutes} 分鐘`), ...statusChips(L),
      L.detail || (L.quotes && L.quotes.length) ? h('button', { type: 'button', class: 'tag tag-info', onclick: () => detailSheet(L) }, '玩法／詳情') : null));
}
function explainRow(ok, text, sid) {
  return h('div', { class: 'fb ' + (ok ? 'ok' : 'bad') }, h('b', null, ok ? '✓ 啱' : '✗ 唔啱'), text ? h('p', { class: 'pre' }, text) : null, sid ? srcLink(sid) : null);
}

// ---------- level dispatcher ----------
function playLevel(root, L, ctx) {
  if (!L) return;
  root.append(levelHead(L));
  const area = h('div', { class: 'game' }); root.append(area);
  const st = ctx.st;
  const r = rng((P.session.seed || 1) + P.session.pos * 7919);
  const paint = () => { area.replaceChildren(); (GAMES[L.kind] || noGame)(area, L, st, r, ctx, paint); };
  paint();
}
function noGame(area, L) { area.append(h('p', null, `未支援嘅玩法：${L.kind}`)); }

const GAMES = {
  match(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.right = shuffle(L.pairs.map((p) => p.id), r); st.sel = null; st.done = []; st.miss = 0; st.msg = ''; }
    const P2 = Object.fromEntries(L.pairs.map((p) => [p.id, p]));
    area.append(h('p', { class: 'hint' }, '撳左邊，再撳右邊配對。每錯扣 15 分。'),
      h('div', { class: 'match' },
        h('div', { class: 'col' }, L.pairs.map((p) => h('button', { type: 'button', class: 'tile-btn' + (st.done.includes(p.id) ? ' ok' : st.sel === p.id ? ' sel' : ''), disabled: st.done.includes(p.id), onclick: () => { st.sel = p.id; st.msg = ''; paint(); } }, p.left))),
        h('div', { class: 'col' }, st.right.map((id) => h('button', { type: 'button', class: 'tile-btn' + (st.done.includes(id) ? ' ok' : ''), disabled: st.done.includes(id), onclick: () => {
          if (!st.sel) { st.msg = '先撳左邊'; paint(); return; }
          const want = L.answers ? L.answers[st.sel] : st.sel;
          if (want === id) { st.done.push(st.sel); st.msg = `✓ ${P2[st.sel].left} ↔ ${P2[id].right}`; st.sel = null; } else { st.miss++; st.msg = '✗ 唔啱，再試'; }
          paint();
        } }, P2[id].right)))),
      st.msg ? h('p', { class: 'msg', role: 'status' }, st.msg) : null,
      h('p', { class: 'muted small' }, `錯 ${st.miss} 次`));
    if (st.done.length === L.pairs.length) {
      const sc = score.match(st.miss); ctx.finish(sc);
      area.append(resultPanel(sc, ctx, h('details', { class: 'more' }, h('summary', null, '睇答案同來源'), L.pairs.map((p) => h('div', { class: 'ans' }, h('b', null, p.left), h('span', null, p.right), srcLink(p.source_id))))));
    }
  },
  sort(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.ord = shuffle(L.items, r); st.i = 0; st.pick = -1; st.ok = 0; }
    if (st.i < st.ord.length) {
      const it = st.ord[st.i];
      const ans = L.answers ? L.answers[it.id] : it.bucket;
      area.append(h('div', { class: 'progress-line' }, bar((100 * st.i) / st.ord.length, 'var(--games)'), h('span', null, `${st.i + 1}/${st.ord.length}`)),
        h('div', { class: 'sort-card pop' }, it.text),
        h('div', { class: 'buckets' }, L.buckets.map((b, bi) => h('button', { type: 'button', class: 'bucket' + (st.pick < 0 ? '' : bi === ans ? ' ok' : bi === st.pick ? ' bad' : ''), disabled: st.pick >= 0, onclick: () => { st.pick = bi; if (bi === ans) st.ok++; paint(); } }, icon('buckets', 20), h('span', null, b)))));
      if (st.pick >= 0) {
        area.append(explainRow(st.pick === ans, it.explain, it.source_id),
          btn(st.i + 1 < st.ord.length ? '下一項' : '完成', () => { st.i++; st.pick = -1; paint(); }, 'primary big'));
      }
    } else {
      const sc = score.sort(st.ok, st.ord.length); ctx.finish(sc); area.append(resultPanel(sc, ctx));
    }
  },
  order(area, L, st, r, ctx, paint) {
    const byId = Object.fromEntries(L.items.map((x) => [x.id, x]));
    const answers = L.answers || L.items.map((x) => x.id);
    if (!st.init) { st.init = 1; let o = shuffle(answers, r); if (o.every((v, i) => v === answers[i])) o = o.slice().reverse(); st.o = o; st.sub = false; }
    const mv = (i, d) => { const j = i + d; if (j < 0 || j >= st.o.length) return; [st.o[i], st.o[j]] = [st.o[j], st.o[i]]; paint(); };
    area.append(h('p', { class: 'hint' }, '用 ↑ ↓ 排好次序，再撳「檢查次序」。'),
      h('ol', { class: 'order' }, st.o.map((id, i) => {
        const ok = st.sub ? id === answers[i] : null;
        return h('li', { class: ok == null ? '' : ok ? 'ok' : 'bad' },
          h('span', { class: 'num' }, String(i + 1)), h('span', { class: 'otext' }, byId[id].text),
          st.sub ? null : h('span', { class: 'ob' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': '上移', disabled: i === 0, onclick: () => mv(i, -1) }, icon('up', 20)), h('button', { type: 'button', class: 'icon-btn', 'aria-label': '下移', disabled: i === st.o.length - 1, onclick: () => mv(i, 1) }, icon('down', 20))));
      })));
    if (!st.sub) area.append(btn('檢查次序', () => { st.sub = true; paint(); }, 'primary big'));
    else {
      const sc = score.order(st.o, answers); ctx.finish(sc);
      area.append(resultPanel(sc, ctx, h('details', { class: 'more' }, h('summary', null, '正確次序同解釋'), h('ol', { class: 'ans-list' }, answers.map((id) => h('li', null, h('b', null, byId[id].text), byId[id].explain ? h('p', { class: 'pre small' }, byId[id].explain) : null, srcLink(byId[id].source_id)))))));
    }
  },
  spot(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.picked = []; st.sub = false; }
    const answers = L.answers || L.lines.filter((x) => x.is_error).map((x) => x.id);
    area.append(h('p', { class: 'hint' }, `撳出有錯嘅行（共 ${answers.length} 處），再提交。`),
      h('div', { class: 'doc' }, L.doc_title ? h('div', { class: 'doc-title' }, L.doc_title) : null,
        L.lines.map((ln) => {
          const on = st.picked.includes(ln.id); const err = answers.includes(ln.id);
          const cls = st.sub ? (err && on ? 'ok' : err ? 'miss' : on ? 'bad' : '') : on ? 'sel' : '';
          return h('div', null, h('button', { type: 'button', class: 'doc-line ' + cls, 'aria-pressed': String(on), disabled: st.sub, onclick: () => { st.picked = on ? st.picked.filter((x) => x !== ln.id) : [...st.picked, ln.id]; paint(); } },
            h('span', { class: 'flag' }, on ? icon('flag', 18) : null), h('span', null, ln.text)),
          st.sub && err ? h('div', { class: 'fb ' + (on ? 'ok' : 'bad') + ' small' }, h('p', { class: 'pre' }, ln.explain || ''), srcLink(ln.source_id)) : null);
        })));
    if (!st.sub) area.append(btn(`提交（已揀 ${st.picked.length}）`, () => { st.sub = true; paint(); }, 'primary big'));
    else { const sc = score.spot(st.picked, answers); ctx.finish(sc); area.append(resultPanel(sc, ctx)); }
  },
  build(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.ord = shuffle(L.options, r); st.picked = []; st.sub = false; }
    const answers = L.answers || L.options.filter((o) => o.correct).map((o) => o.id);
    area.append(h('p', { class: 'hint' }, L.prompt || ''), h('p', { class: 'muted small' }, `已揀 ${st.picked.length}/${L.need || answers.length}`),
      h('div', { class: 'opts' }, st.ord.map((o) => {
        const on = st.picked.includes(o.id); const good = answers.includes(o.id);
        const cls = st.sub ? (good && on ? 'ok' : good ? 'miss' : on ? 'bad' : '') : on ? 'sel' : '';
        return h('div', null, h('button', { type: 'button', class: 'opt ' + cls, 'aria-pressed': String(on), disabled: st.sub, onclick: () => { st.picked = on ? st.picked.filter((x) => x !== o.id) : [...st.picked, o.id]; paint(); } }, h('span', { class: 'box' }, on ? icon('check', 18) : null), h('span', null, o.text)),
          st.sub && (on || good) ? h('div', { class: 'fb small ' + (good ? 'ok' : 'bad') }, h('p', { class: 'pre' }, o.explain || ''), srcLink(o.source_id)) : null);
      })));
    if (!st.sub) area.append(btn('提交報告', () => { if (st.picked.length) { st.sub = true; paint(); } }, st.picked.length ? 'primary big' : 'big', { disabled: !st.picked.length }));
    else { const sc = score.build(st.picked, answers); ctx.finish(sc); area.append(resultPanel(sc, ctx)); }
  },
  story(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.i = 0; st.pick = null; st.risk = 0; }
    const S = L.steps;
    if (st.i < S.length) {
      const step = S[st.i];
      const right = (L.answers && L.answers[step.id]) || step.options.filter((o) => o.correct).map((o) => o.id);
      area.append(h('div', { class: 'risk' }, h('span', null, `第 ${st.i + 1}/${S.length} 步`), h('span', null, '風險分'), bar(Math.min(100, st.risk * 10), st.risk ? 'var(--bad)' : 'var(--ok)'), h('b', null, String(st.risk))),
        step.who && step.who.length ? h('div', { class: 'chat' }, step.who.map((w) => h('div', { class: 'bubble' }, h('b', null, w.name), h('p', null, w.line)))) : null,
        step.evidence && step.evidence.length ? h('div', { class: 'evidence' }, h('span', { class: 'muted small' }, '證據'), step.evidence.map((e) => h('span', { class: 'ev' }, icon('doc', 16), e))) : null,
        h('p', { class: 'prompt' }, step.prompt),
        h('div', { class: 'opts' }, step.options.map((o, oi) => {
          const cls = st.pick == null ? '' : right.includes(o.id) ? 'ok' : o.id === st.pick ? 'bad' : '';
          return h('button', { type: 'button', class: 'opt ' + cls, disabled: st.pick != null, onclick: () => { st.pick = o.id; st.risk += o.risk || 0; paint(); } }, h('span', { class: 'let' }, LETTERS[oi]), h('span', null, o.text));
        })));
      if (st.pick != null) {
        const o = step.options.find((x) => x.id === st.pick);
        area.append(h('div', { class: 'fb ' + (right.includes(o.id) ? 'ok' : 'bad') }, h('b', null, `${right.includes(o.id) ? '✓' : '✗'} 風險 +${o.risk || 0}`), h('p', { class: 'pre' }, o.explain || ''), srcLink(o.source_id)),
          btn(st.i + 1 < S.length ? '下一步' : '睇結局', () => { st.i++; st.pick = null; paint(); }, 'primary big'));
      }
    } else {
      const sc = score.story(st.risk); ctx.finish(sc, { zero: st.risk === 0 });
      area.append(h('div', { class: 'ending' }, icon(st.risk === 0 ? 'shield' : st.risk <= 3 ? 'flag' : 'gavel', 28), h('b', null, st.risk === 0 ? '結局：零風險' : st.risk <= 3 ? '結局：有啲漏洞' : '結局：高風險'), h('span', null, `總風險分 ${st.risk}`)), resultPanel(sc, ctx));
    }
  },
  write(area, L, st, r, ctx, paint) {
    if (!st.init) { st.init = 1; st.txt = ''; st.show = false; st.marks = {}; st.sub = false; }
    const RK = L.rubric_keywords || []; const C = L.checks || [];
    area.append(L.intro ? h('div', { class: 'bubble big' }, h('p', { class: 'pre' }, L.intro)) : null, h('p', { class: 'prompt' }, L.prompt || ''));
    if (!st.show) {
      const ta = h('textarea', { class: 'ta', rows: L.long ? 8 : 4, placeholder: '可以打字（選擇性），或者喺心入面諗好', 'aria-label': '你嘅答案' });
      ta.value = st.txt; ta.addEventListener('input', () => { st.txt = ta.value; });
      area.append(ta, btn('諗好咗，睇範文同評分', () => { st.show = true; const hits = writeKeywordHits(st.txt, RK); hits.forEach((v, i) => { if (v) st.marks['k' + i] = true; }); paint(); }, 'primary big'));
      return;
    }
    area.append(h('div', { class: 'model' }, h('h3', { class: 'sub' }, '範文'), h('p', { class: 'pre' }, L.model_answer || ''), L.model_source_id ? srcLink(L.model_source_id) : null),
      h('h3', { class: 'sub' }, '自評：撳你有寫到嘅'),
      h('div', { class: 'opts' },
        RK.map((k, i) => { const on = !!st.marks['k' + i]; return h('button', { type: 'button', class: 'opt ' + (on ? 'sel' : ''), 'aria-pressed': String(on), disabled: st.sub, onclick: () => { st.marks['k' + i] = !on; paint(); } }, h('span', { class: 'box' }, on ? icon('check', 18) : null), h('span', null, k.label)); }),
        C.map((c, i) => { const on = !!st.marks['c' + i]; return h('button', { type: 'button', class: 'opt ' + (on ? 'sel' : ''), 'aria-pressed': String(on), disabled: st.sub, onclick: () => { st.marks['c' + i] = !on; paint(); } }, h('span', { class: 'box' }, on ? icon('check', 18) : null), h('span', null, c)); })));
    if (st.txt) area.append(h('p', { class: 'muted small' }, '已按你打嘅字自動剔咗關鍵詞，可以再改。'));
    if (!st.sub) area.append(btn('完成評分', () => { st.sub = true; paint(); }, 'primary big'));
    else { const hits = Object.values(st.marks).filter(Boolean).length; const sc = score.write(hits, RK.length + C.length || 1); ctx.finish(sc); area.append(resultPanel(sc, ctx)); }
  },
  quiz(area, L, st, r, ctx, paint) {
    const pool = L.pool || {};
    if (!st.init) {
      st.init = 1;
      let qs = D.quiz.items.filter((q) => q.track === (pool.track || L.track));
      // half from the quickfire set, the rest from every other question of the track (incl. new batch items), mixed
      const n = pool.count || 8;
      const quick = shuffle(qs.filter((q) => q.set === 'quickfire'), r).slice(0, Math.ceil(n / 2));
      const rest = shuffle(qs.filter((q) => q.set !== 'quickfire'), r).slice(0, n - quick.length);
      st.qs = shuffle(quick.concat(rest), r); st.i = 0; st.sel = null; st.secs = pool.seconds_per_question || 15; st.left = st.secs; st.pts = 0; st.streak = 0; st.max = 0; st.good = 0;
    }
    clearInterval(st.timer);
    if (st.i >= st.qs.length) {
      const sc = score.quiz(st.good, st.qs.length); ctx.finish(sc, { pts: st.pts, streak: st.max });
      area.append(h('div', { class: 'quick-sum' }, h('span', null, '得分'), h('b', null, String(st.pts)), h('span', null, `最長連勝 ${st.max}`)), resultPanel(sc, ctx));
      return;
    }
    const q = st.qs[st.i];
    const answer = (i) => {
      if (st.sel != null) return; clearInterval(st.timer);
      st.sel = i; const right = i === q.answer;
      if (right) { st.pts += quickPoints(st.left, st.streak); st.streak++; st.max = Math.max(st.max, st.streak); st.good++; } else st.streak = 0;
      recordQuiz(q, right); save(); paint();
    };
    area.append(h('div', { class: 'quick-top' }, ring((100 * st.left) / st.secs, { size: 54, color: st.left <= 5 ? 'var(--bad)' : 'var(--crs)', label: String(st.left) }),
      h('div', null, h('b', null, `${st.i + 1}/${st.qs.length}`), h('span', null, `得分 ${st.pts} · 連勝 ${st.streak}`))));
    area.append(mcqBody(q, st.sel, answer));
    if (st.sel != null) area.append(btn(st.i + 1 < st.qs.length ? '下一題' : '完成', () => { st.i++; st.sel = null; st.left = st.secs; paint(); }, 'primary big'));
    else {
      st.timer = setInterval(() => {
        if (!area.isConnected) { clearInterval(st.timer); return; }
        st.left--; if (st.left <= 0) { clearInterval(st.timer); st.left = 0; answer(-2); return; }
        const rt = area.querySelector('.quick-top'); if (rt) rt.firstChild.replaceWith(ring((100 * st.left) / st.secs, { size: 54, color: st.left <= 5 ? 'var(--bad)' : 'var(--crs)', label: String(st.left) }));
      }, 1000);
    }
  },
};

// multiple-choice body used by quiz level, quiz item, bank, challenge, adventure
// per-option explanations (content: option_explains[], same order as options). When present, the ✓/✗ lines
// duplicated inside explain are dropped and only the rest of explain is shown; items without it are unchanged.
const MARK_LINE = /^\s*[✓✗]/;
export function explainBlock(q, sel) {
  const oe = Array.isArray(q.option_explains) && q.option_explains.length === q.options.length ? q.option_explains : null;
  if (!oe) return h('p', { class: 'pre' }, q.explain || q.detail || '');
  const rest = (q.explain || '').split('\n').filter((l) => !MARK_LINE.test(l)).join('\n').trim();
  return h('div', { class: 'opt-ex-wrap' },
    rest ? h('p', { class: 'pre' }, rest) : null,
    h('ul', { class: 'opt-ex', 'aria-label': '逐個選項解釋' }, oe.map((t, i) => {
      const good = i === q.answer;
      return h('li', { class: (good ? 'ok' : 'bad') + (i === sel ? ' picked' : '') },
        h('span', { class: 'mk', 'aria-label': good ? '啱' : '錯' }, good ? '✓' : '✗'), h('b', { class: 'let' }, LETTERS[i]),
        h('span', { class: 'tx' }, t), i === sel ? h('span', { class: 'tag tag-pick' }, '你揀') : null);
    })));
}
let freshAnswer = null; // id of the question just answered: its feedback is scrolled into view once
function revealFeedback(wrap) {
  requestAnimationFrame(() => {
    const fb = wrap.querySelector('.fb'); if (!fb || !fb.isConnected) return;
    const hd = document.querySelector('#view .scr-head'); const top = hd ? hd.getBoundingClientRect().bottom : 0;
    const r = fb.getBoundingClientRect();
    const box = (wrap.closest('.panel') || wrap).getBoundingClientRect(); const room = innerHeight - top - 24;
    if (r.top >= top + 8 && r.bottom <= innerHeight) return; // already fully visible below the bar
    // whole question + feedback fits: show it from its top; otherwise start at the feedback. Never under the bar.
    const target = box.bottom - box.top <= room ? box.top : r.top;
    window.scrollBy(0, target - top - 12);
  });
}
export function mcqBody(q, sel, onAnswer) {
  const wrap = h('div', { class: 'mcq' },
    h('div', { class: 'chip-row' }, q.format ? h('span', { class: 'tag' }, q.format) : null, q.topic ? h('span', { class: 'tag' }, q.topic) : null, h('span', { class: 'tag' }, '★'.repeat(q.difficulty || 1)), ...statusChips(q)),
    h('p', { class: 'q' }, q.title),
    h('div', { class: 'opts' }, q.options.map((o, i) => h('button', { type: 'button', class: 'opt ' + (sel == null ? '' : i === q.answer ? 'ok' : i === sel ? 'bad' : ''), disabled: sel != null, onclick: () => { freshAnswer = q.id; onAnswer(i); } }, h('span', { class: 'let' }, LETTERS[i]), h('span', null, o)))));
  if (sel != null) {
    wrap.append(h('div', { class: 'fb ' + (sel === q.answer ? 'ok' : 'bad') }, h('b', null, sel === q.answer ? '✓ 啱' : sel === -2 ? '⏱ 超時' : '✗ 唔啱'),
      explainBlock(q, sel),
      caveatNote(q),
      h('div', { class: 'row-btns' }, (q.quotes && q.quotes.length) || q.source_id ? btn('原文同來源', () => sheet(q.title, caveatNote(q), ...(q.quotes || []).map(quoteBlock), srcLink(q.source_id || q.source_url)), 'small ghost') : null)));
  }
  if (sel != null && freshAnswer === q.id) { freshAnswer = null; revealFeedback(wrap); }
  return wrap;
}

function playQuizItem(root, q, ctx) {
  if (!q) return;
  const st = ctx.st;
  const paint = () => {
    root.replaceChildren(h('div', { class: 'lv-head' }, h('span', { class: 'lv-kind t-' + q.track }, icon('bolt', 18), '快答')));
    root.append(mcqBody(q, st.sel, (i) => { st.sel = i; recordQuiz(q, i === q.answer); ctx.finish(i === q.answer ? 100 : 0); paint(); }));
    if (st.sel != null) root.append(btn('下一個 ›', ctx.next, 'primary big'));
  };
  if (st.sel == null && ctx.done) st.sel = q.answer;
  paint();
}
function playFlash(root, f, ctx) {
  if (!f) return;
  const st = ctx.st;
  const paint = () => {
    root.replaceChildren(h('div', { class: 'lv-head' }, h('span', { class: 'lv-kind t-' + f.track }, icon('cards', 18), 'Flashcard'), h('div', { class: 'chip-row' }, ...statusChips(f))));
    root.append(h('button', { type: 'button', class: 'flash' + (st.flip ? ' back' : ''), onclick: () => { st.flip = !st.flip; paint(); }, 'aria-label': st.flip ? '答案' : '問題，撳睇答案' },
      h('span', { class: 'flash-side' }, st.flip ? '答案' : '問題'), h('span', { class: 'flash-t pre' }, st.flip ? f.back : f.front), h('span', { class: 'muted small' }, st.flip ? '撳返轉' : '撳一下揭答案')));
    if (st.flip) root.append(h('div', { class: 'row-btns' }, btn('未識', () => { P.flash[f.id] = false; ctx.finish(0); save(); ctx.next(); }, 'big'), btn('識咗', () => { P.flash[f.id] = true; ctx.finish(100); save(); ctx.next(); }, 'primary big')), h('div', { class: 'row-btns' }, btn('來源', () => detailSheet(f), 'small ghost')));
  };
  paint();
}
function playTree(root, t, ctx) {
  if (!t) return;
  root.append(h('div', { class: 'lv-head' }, h('span', { class: 'lv-kind t-' + t.track }, icon('tree', 18), '決策樹'), h('h2', { class: 'lv-title' }, t.title)));
  root.append(treeWalker(t, ctx.st, () => { ctx.finish(100); }, ctx.next));
}
function playNews(root, n, ctx) {
  if (!n) return;
  P.newsRead[n.id] = true; save();
  ctx.finish(100);
  root.append(h('div', { class: 'lv-head' }, h('span', { class: 'lv-kind t-' + n.track }, icon('news', 18), '新例速遞')),
    h('div', { class: 'news-card big' }, h('span', { class: 'date' }, n.date), h('h2', null, n.title), h('p', null, n.short), h('div', { class: 'chip-row' }, h('span', { class: 'tag st-' + n.status }, n.status), ...statusChips(n))),
    btn('原文同來源', () => detailSheet(n), 'ghost'), btn('下一個 ›', ctx.next, 'primary big'));
}

// ---------- summary ----------
function renderSummary(root, ses) {
  const res = ses.results;
  const avg = res.length ? Math.round(res.reduce((a, x) => a + x[1], 0) / res.length) : 0;
  if (ses.night && !ses.nightSaved) { P.nights[dayKey()] = avg; ses.nightSaved = true; save(); }
  const before = new Set(ses.badgesBefore || []);
  const newB = D.badges.items.filter((b) => badgeEarned(D, b, P) && !before.has(b.id));
  const els = new Set();
  ses.queue.forEach((q) => { const it = q.t === 'level' ? IX.lv[q.id] : q.t === 'quiz' ? IX.q[q.id] : q.t === 'flash' ? IX.fc[q.id] : q.t === 'tree' ? IX.tree[q.id] : null; (it && it.element_ids || []).forEach((e) => els.add(e)); });
  const review = [...els].map((e) => IX.el[e]).filter(Boolean).map((e) => [e, mastery(D, e.id, P).m]).sort((a, b) => a[1] - b[1]).slice(0, 4);
  root.append(h('div', { class: 'summary' },
    h('div', { class: 'sum-hero pop' }, ring(avg, { size: 120, stroke: 12, color: 'var(--hero)' }), h('h1', null, ses.night ? '今晚打咗卡！' : '完成！'), h('p', null, `${res.length} 項 · 約 ${ses.target} 分鐘`)),
    newB.length ? h('div', { class: 'new-badges' }, h('h3', { class: 'sub' }, '新徽章'), h('div', { class: 'badge-row' }, newB.map((b) => h('div', { class: 'medal on pop' }, icon('badge', 28), h('b', null, b.title))))) : null,
    review.length ? h('div', null, h('h3', { class: 'sub' }, '下一步溫呢啲'), h('div', { class: 'list' }, review.map(([e, m]) => h('button', { type: 'button', class: 'card', onclick: () => elementSheet(e) }, h('span', { class: 'card-ic t-' + e.track }, icon(e.icon || 'doc')), h('span', { class: 'card-main' }, h('span', { class: 'card-title' }, e.title), h('span', { class: 'card-meta' }, m >= 0 ? `掌握 ${m}%` : '未有成績')), h('span', { class: 'card-go' }, '›'))))) : null,
    h('div', { class: 'row-btns' }, btn('返主畫面', () => { P.session = null; save(); nav('#/home'); }, 'primary big'), btn('再嚟一節', () => { P.session = null; save(); nav('#/tonight'); }, 'big'))));
  if (newB.length) toast(`新徽章：${newB.map((b) => b.title).join('、')}`);
}
