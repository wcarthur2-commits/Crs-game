// DOM helpers, icons, rings, bottom sheet, chips. Content strings are always set as text (never innerHTML).
const SVGNS = 'http://www.w3.org/2000/svg';

function add(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}
function setProps(el, props, svg) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') el.textContent = v;
    else if (!svg && (k === 'value' || k === 'checked' || k === 'disabled')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  setProps(el, props, false);
  add(el, kids);
  return el;
}
export function s(tag, props, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  setProps(el, props, true);
  add(el, kids);
  return el;
}
export const btn = (label, onClick, cls = '', extra = {}) => h('button', { type: 'button', class: 'btn ' + cls, onclick: onClick, ...extra }, label);

// ---------- icons (24x24 stroke) ----------
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  back: 'M15 5l-7 7 7 7',
  play: 'M7 4l13 8-13 8z',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  games: 'M6 7h12a4 4 0 014 4v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a4 4 0 014-4zM7 10v4M5 12h4M16 11h.01M18 13h.01',
  map: 'M5 6a2 2 0 104 0 2 2 0 00-4 0zM15 6a2 2 0 104 0 2 2 0 00-4 0zM10 18a2 2 0 104 0 2 2 0 00-4 0zM9 6h6M7.5 8l3.5 8M16.5 8L13 16',
  case: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  news: 'M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5',
  badge: 'M12 3a6 6 0 100 12 6 6 0 000-12zM8.5 14L7 22l5-3 5 3-1.5-8',
  abc: 'M3 18l4.5-12 4.5 12M4.7 14h5.6M15 8h6M15 12h6M15 16h4',
  book: 'M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7z',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  check: 'M5 12l4 4 10-10',
  x: 'M6 6l12 12M18 6L6 18',
  up: 'M12 5l-6 6M12 5l6 6M12 5v14',
  down: 'M12 19l-6-6M12 19l6-6M12 19V5',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  text: 'M4 7V5h16v2M9 19h6M12 5v14',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  buckets: 'M3 7h6l-1 12H4zM15 7h6l-1 12h-4zM12 3v6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  timer: 'M12 8v5l3 2M9 2h6M12 4a9 9 0 100 18 9 9 0 000-18z',
  chat: 'M4 5h16v11H9l-5 4z',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  blocks: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  checklist: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 9h4.5a1.5 1.5 0 010 3H10h4a1.5 1.5 0 010 3H9M11 7v2M11 15v2',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  exchange: 'M4 8h14l-3-3M20 16H6l3 3',
  form: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',
  gavel: 'M14 4l6 6M11 7l6 6M8 10l5-5 6 6-5 5zM10 12l-7 7',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  handshake: 'M2 12l5-5 4 2 4-2 5 5-7 7-2-2-2 2zM7 7l5 5',
  merge: 'M6 3v6a6 6 0 006 6h6M18 15l-3-3M18 15l-3 3M6 21v-6',
  org: 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  people: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M16 11a3 3 0 100-6M18 20a6 6 0 00-3-5.2',
  portal: 'M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01',
  refresh: 'M20 11a8 8 0 00-14.9-3M4 4v4h4M4 13a8 8 0 0014.9 3M20 20v-4h-4',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  swap: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11a1 1 0 100 2 1 1 0 000-2z',
  venn: 'M9 6a6 6 0 100 12 6 6 0 000-12zM15 6a6 6 0 100 12 6 6 0 000-12z',
  tree: 'M12 3v5M12 8l-6 5M12 8l6 5M6 13v3M18 13v3M4 16h4v4H4zM16 16h4v4h-4z',
  cards: 'M7 4h11a2 2 0 012 2v11M4 7h11a2 2 0 012 2v10H6a2 2 0 01-2-2z',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a4 4 0 014-4h6M18 9v6a4 4 0 01-4 4H8',
};
export function icon(name, size = 22, cls = '') {
  const d = P[name] || P.info;
  return s('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: name === 'play' ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'ico ' + cls, 'aria-hidden': 'true' }, s('path', { d }));
}
export const hasIcon = (n) => !!P[n];

// ---------- progress ring ----------
export function ring(pct, { size = 56, stroke = 6, color = 'var(--crs)', label, parts } = {}) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const cx = size / 2;
  const segs = parts || [{ pct, color }];
  let off = 0;
  const arcs = segs.filter((p) => p.pct > 0).map((p) => {
    const len = (Math.max(0, Math.min(100, p.pct)) / 100) * c;
    const el = s('circle', { cx, cy: cx, r, fill: 'none', stroke: p.color, 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-dasharray': `${len} ${c}`, 'stroke-dashoffset': -off, transform: `rotate(-90 ${cx} ${cx})` });
    off += len; return el;
  });
  return s('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: 'ring', role: 'img', 'aria-label': `${Math.round(pct)}%` },
    s('circle', { cx, cy: cx, r, fill: 'none', stroke: 'var(--track)', 'stroke-width': stroke }), ...arcs,
    s('text', { x: cx, y: cx + 4, 'text-anchor': 'middle', class: 'ring-t', 'font-size': Math.round(size / 4.4) }, label ?? `${Math.round(pct)}%`));
}
export function bar(pct, color = 'var(--crs)') {
  return h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${Math.max(0, Math.min(100, pct))}%;background:${color}` }));
}

// ---------- bottom sheet ----------
let sheetStack = [];
export function closeSheets() { while (sheetStack.length) sheetStack.pop().remove(); document.body.classList.remove('sheet-open'); }
export function closeTopSheet() { const s0 = sheetStack.pop(); if (s0) s0.remove(); if (!sheetStack.length) document.body.classList.remove('sheet-open'); }
export function sheet(title, ...body) {
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'grab', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet-head' }, h('h2', { class: 'sheet-title' }, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': '關閉', onclick: closeTopSheet }, icon('close'))),
    h('div', { class: 'sheet-body' }, ...body));
  const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === wrap) closeTopSheet(); } }, panel);
  document.getElementById('sheet-root').append(wrap);
  sheetStack.push(wrap);
  document.body.classList.add('sheet-open');
  setTimeout(() => panel.querySelector('.icon-btn').focus(), 30);
  return wrap;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetStack.length) closeTopSheet(); });

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2400);
}

// ---------- segmented control ----------
export function seg(options, value, onChange, cls = '') {
  return h('div', { class: 'seg ' + cls, role: 'tablist' }, options.map(([v, label]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': String(v === value), class: v === value ? 'on' : '', onclick: () => onChange(v),
  }, label)));
}
export function chips(options, value, onChange) {
  return h('div', { class: 'chips' }, options.map(([v, label]) => h('button', { type: 'button', class: 'chip' + (v === value ? ' on' : ''), 'aria-pressed': String(v === value), onclick: () => onChange(v) }, label)));
}
