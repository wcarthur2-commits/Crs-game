// Provision reader: full verbatim text (EN or official 中文本), never truncated or rewritten.
import { h, icon, btn, sheet, closeSheets, toast, seg } from './ui.js?v=v2';
import { IX, P, save, nav, isNewItem } from './state.js?v=v2';
import { provisionDepths } from './engine.js?v=v2';
import { srcLink, elementSheet, termSheet, fullTerm } from './common.js?v=v2';

const isHeading = (t) => /^\d+[A-Z]*\.\s/.test(t) || /^Part \d+[A-Z]*\b/.test(t) || /^Division \d+/.test(t) || /^Schedule /.test(t) || /^第\s*\d+\s*[部分]/.test(t);
export function resetReaderCache() {}
const uiZh = () => /^zh/i.test(document.documentElement.lang || '');

// version of the provision for the chosen language (all values straight from provisions.json)
function version(p, lang) {
  if (lang === 'zh' && p.zh && p.zh.text) {
    const z = p.zh;
    return { lang: 'zh', label: '中文', text: z.text, url: z.source_url, url2: z.source_url_bilingual, src: z.source_id || p.source_id, status: z.status, reason: z.unverified_reason, date: z.accessed, where: z.pdf_pages ? `PDF 頁 ${z.pdf_pages.join('–')}` : '', title: z.title, note: z.extraction_note, htmlLang: 'zh-Hant' };
  }
  return { lang: 'en', label: 'English', text: p.text, url: p.source_url || p.url, src: p.source_id, status: p.status, reason: p.unverified_reason, date: p.version_date || p.accessed, where: p.pdf_lines ? `PDF 行 ${p.pdf_lines.join('–')}` : '', htmlLang: 'en' };
}

// first occurrence of each of the provision's terms[] in the text (longest terms first, no overlaps)
function markTerms(lines, terms, lang) {
  const marks = new Map(); // line -> [{k, len, t}]
  const taken = (i, k, len) => (marks.get(i) || []).some((m) => k < m.k + m.len && m.k < k + len);
  const list = (terms || []).map(fullTerm).map((t) => ({ t, w: lang === 'zh' ? t.term_zh : t.term })).filter((x) => x.w).sort((a, b) => b.w.length - a.w.length);
  for (const { t, w } of list) {
    let hit = null;
    for (let pass = 0; pass < 2 && !hit; pass++) {
      for (let i = 0; i < lines.length && !hit; i++) {
        const hay = pass ? lines[i].toLowerCase() : lines[i]; const needle = pass ? w.toLowerCase() : w;
        let k = hay.indexOf(needle);
        while (k >= 0 && taken(i, k, w.length)) k = hay.indexOf(needle, k + 1);
        if (k >= 0) hit = { i, k };
      }
    }
    if (hit) { const a = marks.get(hit.i) || []; a.push({ k: hit.k, len: w.length, t }); marks.set(hit.i, a); }
  }
  marks.forEach((a) => a.sort((x, y) => x.k - y.k));
  return marks;
}

export function renderReader(root, id, line) {
  const p = IX.prov[id];
  if (!p) { root.append(h('p', null, '搵唔到條文。'), btn('返資料庫', () => nav('#/library'), 'ghost')); return; }
  const hasZh = !!(p.zh && p.zh.text);
  const lang = (P.readerLang || (uiZh() ? 'zh' : 'en')) === 'zh' && hasZh ? 'zh' : 'en';
  const V = version(p, lang);
  const size = P.readerSize || 18;
  const bm = P.bookmarks.includes(p.id);
  const lines = V.text.split('\n');
  const depths = provisionDepths(lines);
  const marks = markTerms(lines, p.terms, lang);
  const setSize = (d) => { P.readerSize = Math.max(14, Math.min(28, (P.readerSize || size) + d)); save(); body.style.fontSize = P.readerSize + 'px'; sizeLbl.textContent = String(P.readerSize); };
  const sizeLbl = h('span', { class: 'size-lbl', 'aria-live': 'polite' }, String(size));
  const setLang = (l) => { P.readerLang = l; save(); window.dispatchEvent(new Event('rerender')); };
  const head = h('header', { class: 'scr-head reader-head' },
    h('div', { class: 'scr-bar' },
      h('button', { type: 'button', class: 'back', onclick: () => (history.length > 1 ? history.back() : nav('#/library')), 'aria-label': '返回' }, icon('back', 20), h('span', null, '返回')),
      h('h1', { class: 'scr-title small' }, icon('gavel', 20), '條文全文'),
      h('button', { type: 'button', class: 'icon-btn sq', onclick: () => nav('#/home'), 'aria-label': '主畫面' }, icon('home', 20))),
    h('div', { class: 'reader-tools' },
      hasZh ? seg([['zh', '中文'], ['en', 'EN']], lang, setLang, 'lang-seg') : null,
      h('button', { type: 'button', class: 'tool', onclick: () => setSize(-1), 'aria-label': '細啲字' }, 'A−'), sizeLbl,
      h('button', { type: 'button', class: 'tool', onclick: () => setSize(1), 'aria-label': '大啲字' }, 'A+'),
      h('button', { type: 'button', class: 'tool', onclick: () => tocSheet(), 'aria-label': '目錄' }, icon('list', 18), h('span', null, '目錄')),
      h('button', { type: 'button', class: 'tool', onclick: () => termsSheet(), 'aria-label': '定義' }, icon('book', 18), h('span', null, '定義')),
      h('button', { type: 'button', class: 'tool' + (bm ? ' on' : ''), 'aria-pressed': String(bm), onclick: () => { P.bookmarks = bm ? P.bookmarks.filter((x) => x !== p.id) : [...P.bookmarks, p.id]; save(); toast(bm ? '已移除書籤' : '已加書籤'); window.dispatchEvent(new Event('rerender')); }, 'aria-label': '書籤' }, icon('bookmark', 18), h('span', null, bm ? '已加' : '書籤'))));
  const uv = V.status === 'UNVERIFIED';
  const srcTitle = (IX.src[V.src] && IX.src[V.src].title) || V.url;
  const metaBox = h('div', { class: 'reader-meta' },
    h('h2', { class: 'ref' }, p.ref),
    V.title && V.title !== p.ref ? h('p', { class: 'ref-zh' }, V.title) : null,
    h('div', { class: 'chip-row' },
      p.excerpt ? h('span', { class: 'tag tag-ex' }, '節錄') : h('span', { class: 'tag tag-ok' }, '全文'),
      h('span', { class: 'tag tag-lang' }, V.label),
      p.amending ? h('span', { class: 'tag' }, '修訂條文') : null,
      uv ? h('span', { class: 'tag tag-uv' }, 'UNVERIFIED') : null,
      isNewItem(p.id) ? h('span', { class: 'tag tag-new' }, '新') : null,
      V.note ? h('button', { type: 'button', class: 'tag tag-info', onclick: () => sheet('中文本抽取說明', h('p', { class: 'pre' }, V.note)) }, '抽取說明') : null),
    uv && V.reason ? h('p', { class: 'uv-note' }, 'UNVERIFIED：' + V.reason) : null,
    h('p', { class: 'muted small' }, `版本／查閱日期 ${V.date || '—'}${V.where ? ' · ' + V.where : ''}`),
    srcLink(V.url, '來源：' + srcTitle + (lang === 'zh' ? '（中文本）' : '')),
    V.url2 && V.url2 !== V.url ? srcLink(V.url2, '雙語版本') : null,
    (p.element_ids || []).length ? h('div', { class: 'el-chips' }, p.element_ids.map((e) => IX.el[e] ? h('button', { type: 'button', class: 'chip t-' + IX.el[e].track, onclick: () => elementSheet(IX.el[e]) }, IX.el[e].title) : null)) : null);
  const body = h('article', { class: 'prov-text' + (lang === 'zh' ? ' zh' : ''), lang: V.htmlLang, 'data-prov': p.id, 'data-lang': lang, style: `font-size:${size}px` },
    lines.map((ln, i) => {
      const ms = marks.get(i);
      const cls = 'pl d' + depths[i] + (isHeading(ln) ? ' hd' : '') + (ms ? ' def' : '') + (line != null && Number(line) === i ? ' flash-hl' : '');
      if (!ms) return h('p', { class: cls, id: 'L' + i }, ln);
      const parts = []; let at = 0;
      ms.forEach((m) => { parts.push(ln.slice(at, m.k), h('dfn', { tabindex: 0, role: 'button', class: m.t.status === 'UNVERIFIED' ? 'uv' : '', onclick: () => termSheet(m.t, { prefer: lang }), onkeydown: (e) => { if (e.key === 'Enter') termSheet(m.t, { prefer: lang }); } }, ln.slice(m.k, m.k + m.len))); at = m.k + m.len; });
      parts.push(ln.slice(at));
      return h('p', { class: cls, id: 'L' + i }, parts.filter((x) => x !== ''));
    }));
  root.append(head, h('div', { class: 'reader' }, metaBox, body, p.excerpt ? h('p', { class: 'uv-note' }, '節錄：以上只係部分條文。全文請睇來源。') : null));
  if (line != null) setTimeout(() => { const el = document.getElementById('L' + line); if (el) el.scrollIntoView({ block: 'center' }); }, 60);

  function jump(i) { closeSheets(); const el = document.getElementById('L' + i); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash-hl'); setTimeout(() => el.classList.remove('flash-hl'), 1600); } }
  function tocSheet() {
    const items = lines.map((ln, i) => [ln, i]).filter(([ln, i]) => isHeading(ln) || depths[i] === 1 || marks.has(i));
    const lbl = (ln, i) => (marks.has(i) && !isHeading(ln) && depths[i] !== 1 ? '定義：' + marks.get(i).map((m) => (lang === 'zh' ? m.t.term_zh : m.t.term)).join('、') : Array.from(ln).slice(0, 60).join('') + (Array.from(ln).length > 60 ? '…' : ''));
    sheet('目錄', items.length ? h('div', { class: 'toc' }, items.map(([ln, i]) => h('button', { type: 'button', class: 'toc-i d' + (isHeading(ln) ? 0 : depths[i] === 1 ? 1 : 2), onclick: () => jump(i) }, lbl(ln, i)))) : h('p', { class: 'muted' }, '呢條冇分段。'),
      h('p', { class: 'muted small' }, '目錄只係跳去原文位置；原文冇刪改。'));
  }
  function termsSheet() {
    const ts = (p.terms || []).map(fullTerm);
    sheet('定義詞（本條）', h('p', { class: 'muted small' }, `${ts.length} 個 · 撳睇逐字定義同來源`),
      ts.length ? h('div', { class: 'toc' }, ts.map((t) => h('button', { type: 'button', class: 'toc-i term-i', onclick: () => termSheet(t, { prefer: lang }) },
        h('b', null, lang === 'zh' && t.term_zh ? t.term_zh : t.term), ' ', h('span', { class: 'muted' }, lang === 'zh' ? t.term : t.term_zh || ''), t.status === 'UNVERIFIED' ? h('span', { class: 'tag tag-uv' }, 'UNVERIFIED') : null))) : h('p', { class: 'muted' }, '呢條冇列定義詞。'),
      btn('打開詞彙表（全部）', () => { closeSheets(); nav('#/glossary'); }, 'ghost'));
  }
}
