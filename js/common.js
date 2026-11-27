// Shared building blocks: screen header, status chips, detail sheet, quotes, sources, cards.
import { h, icon, btn, sheet, seg, closeSheets } from './ui.js?v=v4';
import { D, IX, P, TRACK, route, setRoute, nav, isNewItem, sourceInfo, trackName } from './state.js?v=v4';
import { mastery } from './engine.js?v=v4';

export function routeSeg() {
  return seg(Object.keys(TRACK).map((t) => [t, TRACK[t].short]), route(), setRoute, 'route-seg r-' + route());
}

export function screenHead(title, { iconName, showRoute = true, right } = {}) {
  return h('header', { class: 'scr-head' },
    h('div', { class: 'scr-bar' },
      h('button', { type: 'button', class: 'back', onclick: () => nav('#/home'), 'aria-label': '返主畫面' }, icon('back', 20), h('span', null, '主畫面')),
      h('h1', { class: 'scr-title' }, iconName ? icon(iconName, 22) : null, title),
      right || null),
    showRoute ? routeSeg() : null);
}

export function statusChips(item, { pending = true } = {}) {
  if (!item) return [];
  const out = [];
  if (item.status === 'UNVERIFIED') {
    out.push(h('button', { type: 'button', class: 'tag tag-uv', onclick: (e) => { e.stopPropagation(); uvSheet(item); } }, 'UNVERIFIED'));
  }
  if (item.non_statutory) out.push(h('span', { class: 'tag tag-ns', title: 'non_statutory' }, '良好做法・非法定'));
  const pend = pending && item.pending_slots && item.pending_slots.length;
  if (pend) out.push(h('button', { type: 'button', class: 'tag tag-pend', onclick: (e) => { e.stopPropagation(); pendSheet(item); } }, '待補充'));
  if (item.id && isNewItem(item.id)) out.push(h('span', { class: 'tag tag-new' }, '新'));
  return out;
}
function uvSheet(item) {
  sheet('UNVERIFIED', h('p', { class: 'pre' }, item.unverified_reason || '未核實'), uvList());
}
function uvList() {
  const ids = [];
  return ids.length ? null : null;
}
function pendSheet(item) {
  const slots = D.unverified.pending_slots.filter((p) => p.element_id === item.id);
  sheet('待補充',
    slots.length ? h('ul', { class: 'plain' }, slots.map((p) => h('li', null, p.slot_name || p.slot))) : null);
}

export function srcLink(idOrUrl, label) {
  const info = sourceInfo(idOrUrl);
  const url = info ? info.url : (/^https?:/.test(idOrUrl || '') ? idOrUrl : null);
  if (!url) return idOrUrl ? h('span', { class: 'src muted' }, idOrUrl) : null;
  return h('a', { class: 'src', href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('link', 16),
    h('span', null, label || (info ? info.title : url)));
}
export function sourcesList(item) {
  const ids = item.sources || [];
  const links = ids.map((id) => srcLink(id)).filter(Boolean);
  if (!links.length && item.source_url) links.push(srcLink(item.source_url));
  return links.length ? h('div', { class: 'srcs' }, h('h3', { class: 'sub' }, '來源'), links) : null;
}
export function quoteBlock(q) {
  return h('figure', { class: 'quote' },
    h('blockquote', { class: 'pre', lang: q.lang || 'en' }, q.text),
    h('figcaption', null,
      q.pin ? h('span', { class: 'pin' }, q.pin) : null,
      q.lang ? h('span', { class: 'meta' }, q.lang === 'zh' ? '中文' : 'English') : null,
      (q.accessed || q.version_date) ? h('span', { class: 'meta' }, '查閱 ' + (q.version_date || q.accessed)) : null,
      ...statusChips(q),
      srcLink(q.url || q.source_id)),
    q.status === 'UNVERIFIED' && q.unverified_reason ? h('p', { class: 'uv-note' }, q.unverified_reason) : null,
    caveatNote(q));
}

export function detailBody(item) {
  return [
    item.short ? h('p', { class: 'lead' }, item.short) : null,
    h('div', { class: 'chip-row' }, statusChips(item)),
    item.detail && item.detail !== item.short ? h('p', { class: 'pre' }, item.detail) : null,
    item.status === 'UNVERIFIED' && item.unverified_reason ? h('p', { class: 'uv-note' }, 'UNVERIFIED：' + item.unverified_reason) : null,
    (item.unverified_notes || []).map((n) => h('p', { class: 'uv-note' }, n)),
    caveatNote(item),
    item.quotes && item.quotes.length ? h('div', null, h('h3', { class: 'sub' }, '原文引文'), item.quotes.map(quoteBlock)) : null,
    sourcesList(item),
    item.updated ? h('p', { class: 'muted small' }, '更新 ' + item.updated) : null,
  ];
}
export function detailSheet(item, ...extra) { return sheet(item.title_long || item.title || item.id, ...detailBody(item), ...extra); }

export function card(item, { onTap, iconName, meta, cls = '', right } = {}) {
  const tap = onTap || (() => detailSheet(item));
  return h('button', { type: 'button', class: 'card ' + cls, onclick: tap },
    h('span', { class: 'card-ic t-' + (item.track || 'INTEG') }, icon(iconName || item.icon || 'doc', 22)),
    h('span', { class: 'card-main' },
      h('span', { class: 'card-title' }, item.title),
      item.short && item.short !== item.title ? h('span', { class: 'card-short' }, item.short) : null,
      meta ? h('span', { class: 'card-meta' }, meta) : null,
      h('span', { class: 'chip-row' }, statusChips(item))),
    right || h('span', { class: 'card-go', 'aria-hidden': 'true' }, '›'));
}

export const SLOT = { hk: '香港條文', oecd: 'OECD', ird: 'IRD', industry: '業界／行業' };

export function elementSheet(el) {
  const m = mastery(D, el.id, P);
  const levels = D.levels.items.filter((l) => l.element_ids.includes(el.id));
  const pend = (el.pending_slots || []);
  const slots = ['hk', 'oecd', 'ird', 'industry'];
  const w = sheet(el.title,
    h('p', { class: 'lead' }, el.short),
    h('div', { class: 'chip-row' }, h('span', { class: 'tag t-' + el.track }, trackName(el.track)), h('span', { class: 'tag' }, el.chapter), ...statusChips(el)),
    h('div', { class: 'mast' }, h('span', null, '掌握度'), h('b', null, m.m >= 0 ? m.m + '%' : '未有成績'), h('span', { class: 'muted' }, `${m.played}/${m.total} 關`)),
    h('div', { class: 'btn-col' },
      btn('睇重點', () => sheet(el.title, ...detailBody({ ...el, quotes: [] })), 'ghost'),
      h('div', { class: 'slot-grid' }, slots.map((sl) => {
        const qs = el.quotes.filter((q) => q.slot === sl);
        const isPend = pend.includes(sl);
        return h('button', { type: 'button', class: 'slot', disabled: !qs.length && !isPend, onclick: () => {
          if (qs.length) sheet(`${el.title} · ${SLOT[sl]}`, qs.map(quoteBlock));
          else sheet(`${SLOT[sl]}：待補充`, h('p', null, '待補充'));
        } }, h('b', null, SLOT[sl]), h('span', null, qs.length ? `${qs.length} 段引文` : isPend ? '待補充' : '—'), isPend ? h('span', { class: 'tag tag-pend' }, '待補充') : null);
      })),
      (el.provision_ids || []).length ? btn(`${el.provisions_label || '睇條文全文'}（${el.provision_ids.length}）`, () => {
        if (el.provision_ids.length === 1) { closeSheets(); nav('#/reader/' + encodeURIComponent(el.provision_ids[0])); return; }
        sheet(el.provisions_label || '睇條文全文', h('div', { class: 'list' }, el.provision_ids.map((pid) => {
          const pv = IX.prov[pid];
          return pv ? card({ ...pv, title: pv.ref, short: pv.excerpt ? '節錄' : '' }, { iconName: 'gavel', onTap: () => { closeSheets(); nav('#/reader/' + encodeURIComponent(pid)); } }) : null;
        })));
      }, 'ghost') : null,
      termChips(el.terms),
      levels.length ? h('div', null, h('h3', { class: 'sub' }, '相關關卡'), h('div', { class: 'list' }, levels.map((l) => levelCard(l)))) : null,
      sourcesList(el)));
  return w;
}

export function levelCard(l, opts = {}) {
  const best = P.best[l.id];
  const kindLabel = (D.levels.kinds || {})[l.kind] || l.kind;
  return card(l, {
    iconName: l.icon || 'games',
    meta: `${kindLabel} · ${l.minutes} 分鐘 · ${'★'.repeat(l.difficulty)}${best >= 0 ? ' · 最佳 ' + best : ''}`,
    onTap: opts.onTap || (() => { closeSheets(); nav('#/level/' + encodeURIComponent(l.id)); }),
    cls: best >= 0 ? 'done' : '',
  });
}

// ---------- defined terms (from terms.json / terms[] — verbatim, never generated) ----------
export const SCHEME = { 'HK-CRS': '香港 CRS', 'HK-CARF': '香港 CARF', 'OECD-CARF': 'OECD CARF' };
export const fullTerm = (t) => (t && IX.term[t.id]) || t;
export function termChips(terms, label = '定義詞') {
  if (!terms || !terms.length) return null;
  return h('div', null, h('h3', { class: 'sub' }, `${label}（${terms.length}）`),
    h('div', { class: 'el-chips' }, terms.map((t0) => { const t = fullTerm(t0); return h('button', { type: 'button', class: 'chip term-chip' + (t.status === 'UNVERIFIED' ? ' uv' : ''), onclick: () => termSheet(t) }, t.term_zh ? `${t.term_zh}・${t.term}` : t.term); })));
}
export function termSheet(t0, { prefer } = {}) {
  const t = fullTerm(t0);
  const zhFirst = (prefer || P.readerLang || 'zh') === 'zh' && t.definition_zh;
  const en = h('figure', { class: 'quote' }, h('blockquote', { class: 'pre', lang: 'en' }, t.definition), h('figcaption', null, h('span', { class: 'meta' }, 'English'), srcLink(t.source_url, '英文原文')));
  const zhNote = !t.definition_zh && t.definition_zh_note ? h('p', { class: 'muted small zh-note' }, '中文本：' + t.definition_zh_note) : null;
  const zh = t.definition_zh ? h('figure', { class: 'quote' }, h('blockquote', { class: 'pre', lang: 'zh-Hant' }, t.definition_zh), h('figcaption', null, h('span', { class: 'meta' }, '中文'), srcLink(t.source_url_zh || t.source_url, '中文本'))) : null;
  const sup = t.superseded_by && IX.term[t.superseded_by];
  return sheet(t.term_zh ? `${t.term_zh}　${t.term}` : t.term,
    h('div', { class: 'chip-row' }, h('span', { class: 'tag' }, SCHEME[t.scheme] || t.scheme), ...statusChips(t), sup ? h('span', { class: 'tag tag-pend' }, '已被取代') : null),
    t.status === 'UNVERIFIED' && t.unverified_reason ? h('p', { class: 'uv-note' }, 'UNVERIFIED：' + t.unverified_reason) : null,
    zhFirst ? [zh, en] : [en, zh || zhNote],
    h('p', { class: 'muted small' }, t.provision_ref),
    caveatNote(t),
    t.term_zh_note ? h('p', { class: 'muted small' }, t.term_zh_note) : null,
    sup ? btn('睇取代後嘅定義：' + (sup.term_zh || sup.term), () => termSheet(sup), 'ghost') : null,
    t.provision_id && IX.prov[t.provision_id] ? btn('喺條文睇', () => { closeSheets(); nav('#/reader/' + encodeURIComponent(t.provision_id)); }, 'ghost') : null,
    btn('詞彙表', () => { closeSheets(); nav('#/glossary'); }, 'ghost'));
}

// caveat: small print shown wherever the content provides one (verified items too)
export function caveatNote(x) { return x && x.caveat ? h('p', { class: 'caveat' }, '附註：' + x.caveat) : null; }
