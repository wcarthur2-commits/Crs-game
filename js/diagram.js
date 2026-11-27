// SVG diagrams: layered node graph, decision-tree flowchart, Venn.
import { s, h } from './ui.js?v=v7';

function clip(t, n) { const a = Array.from(t || ''); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }
// wrap by visual width: CJK = 1 unit, latin = 0.56; up to `max` lines, last one clipped with …
const cw = (ch) => (/[\u2E80-\uFFEF]/.test(ch) ? 1 : 0.56);
function wrapN(t, units, max = 3) {
  const out = []; let line = ''; let u = 0;
  for (const ch of Array.from(t || '')) {
    const w = cw(ch);
    if (u + w > units && line) { out.push(line); line = ''; u = 0; if (out.length === max) break; }
    if (!(line === '' && ch === ' ')) { line += ch; u += w; }
  }
  if (out.length < max && line) out.push(line);
  const used = out.join('').length;
  if (Array.from(t || '').length > used + (out.length - 1) && out.length) out[out.length - 1] = out[out.length - 1].replace(/.$/, '…');
  return out;
}
const wrap2 = (t, n) => wrapN(t, n, 2);

// nodes: [{id,label,row,state?,color?}] rows: [{key,label}] ; style 'dot' | 'box'
export function layeredGraph({ nodes, edges, rows, style = 'dot', perRow = 3, width = 360, onNode, colorOf, ariaLabel, highlight, edgeLabels = true }) {
  const W = width; const padX = 16; const rowGap = style === 'box' ? 74 : 104; const headH = 22;
  const pos = {}; let y = 10; const bands = [];
  rows.forEach((row) => {
    const ns = nodes.filter((n) => n.row === row.key);
    if (!ns.length) return;
    const lines = Math.ceil(ns.length / perRow);
    const bandTop = y;
    for (let li = 0; li < lines; li++) {
      const chunk = ns.slice(li * perRow, (li + 1) * perRow);
      const step = (W - padX * 2) / chunk.length;
      chunk.forEach((n, i) => { pos[n.id] = { x: padX + step * (i + 0.5), y: y + headH + (style === 'box' ? 22 : 24), span: step - 6 }; });
      y += rowGap;
    }
    bands.push({ row, top: bandTop, h: y - bandTop });
  });
  const H = y + 6;
  const g = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', class: 'diagram', role: 'img', 'aria-label': ariaLabel || '' });
  bands.forEach((b, i) => {
    g.append(s('rect', { x: 2, y: b.top + 2, width: W - 4, height: b.h - 6, rx: 14, class: 'band' + (i % 2 ? ' alt' : '') }));
    g.append(s('text', { x: 14, y: b.top + 18, class: 'band-t' }, b.row.label));
  });
  const eg = s('g', { class: 'edges' });
  edges.forEach((e) => {
    const a = pos[e.from]; const b = pos[e.to]; if (!a || !b) return;
    const dy = (b.y - a.y) / 2;
    const d = a.y === b.y ? `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${a.y - 34} ${b.x} ${b.y}` : `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
    const hl = highlight && highlight.has(e.from) && highlight.has(e.to);
    eg.append(s('path', { d, class: 'edge' + (e.type === 'prereq' || e.label === 'prereq' ? ' prereq' : '') + (hl ? ' hl' : '') }));
    if (edgeLabels && e.label && !['related', 'prereq'].includes(e.label)) {
      eg.append(s('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 3, class: 'edge-t', 'text-anchor': 'middle' }, clip(e.label, 8)));
    }
  });
  g.append(eg);
  nodes.forEach((n) => {
    const p = pos[n.id]; if (!p) return;
    const col = colorOf ? colorOf(n) : 'var(--crs)';
    const grp = s('g', { class: 'node' + (onNode ? ' tap' : '') + (n.state ? ' st-' + n.state : ''), tabindex: onNode ? 0 : null, role: onNode ? 'button' : null, 'aria-label': n.label });
    if (style === 'box') {
      const bw = Math.min((W - padX * 2) / Math.min(perRow, nodes.filter((m) => m.row === n.row).length) - 8, 150);
      grp.append(s('rect', { x: p.x - bw / 2, y: p.y - 22, width: bw, height: 44, rx: 12, class: 'nbox', style: `stroke:${col}` }));
      const ls = wrapN(n.label, Math.max(4, Math.floor((bw - 10) / 11.5)), 2);
      ls.forEach((t, i) => grp.append(s('text', { x: p.x, y: p.y + (ls.length === 1 ? 4 : -3 + i * 14), 'text-anchor': 'middle', class: 'n-t' }, t)));
    } else {
      if (n.ring) grp.append(s('circle', { cx: p.x, cy: p.y, r: 25, class: 'halo', style: `stroke:${col}` }));
      grp.append(s('circle', { cx: p.x, cy: p.y, r: 19, class: 'ndot', style: `fill:${col}` }));
      if (n.badge) grp.append(s('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', class: 'n-b' }, n.badge));
      wrapN(n.label, Math.max(6, Math.floor(p.span / 11.5)), 3).forEach((t, i) => grp.append(s('text', { x: p.x, y: p.y + 35 + i * 13, 'text-anchor': 'middle', class: 'n-t' }, t)));
      if (n.dot) grp.append(s('circle', { cx: p.x + 15, cy: p.y - 15, r: 5, class: 'reddot' }));
    }
    if (onNode) {
      grp.addEventListener('click', () => onNode(n));
      grp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNode(n); } });
    }
    g.append(grp);
  });
  return g;
}

// decision tree as flowchart; path = visited node ids
export function treeFlow(tree, path, current) {
  const depth = {}; const order = [];
  const q = [[tree.start, 0]];
  const rIds = new Set(tree.results.map((r) => r.id));
  while (q.length) {
    const [id, d] = q.shift();
    if (id in depth) continue;
    depth[id] = d; order.push(id);
    const n = tree.nodes.find((x) => x.id === id);
    if (n) { q.push([n.yes, d + 1]); q.push([n.no, d + 1]); }
  }
  const maxD = Math.max(...Object.values(depth));
  const rows = []; for (let d = 0; d <= maxD; d++) rows.push({ key: d, label: '' });
  const nodes = order.map((id) => {
    const n = tree.nodes.find((x) => x.id === id); const r = tree.results.find((x) => x.id === id);
    return { id, row: depth[id], label: n ? `問 ${tree.nodes.indexOf(n) + 1}` : (r ? clip(r.verdict, 10) : id), result: rIds.has(id), tone: r && r.tone };
  });
  const edges = [];
  tree.nodes.forEach((n) => { edges.push({ from: n.id, to: n.yes, label: '是' }); edges.push({ from: n.id, to: n.no, label: '否' }); });
  const hl = new Set(path);
  return layeredGraph({
    nodes: nodes.map((n) => ({ ...n, state: n.id === current ? 'cur' : hl.has(n.id) ? 'on' : 'off' })),
    edges, rows, style: 'box', perRow: 4, highlight: hl, ariaLabel: tree.title,
    colorOf: (n) => (n.result ? (n.tone === 'success' ? 'var(--ok)' : n.tone === 'danger' ? 'var(--bad)' : n.tone === 'warning' ? 'var(--carf)' : 'var(--text2)') : 'var(--crs)'),
  });
}

export function venn(v, onPick) {
  const W = 360; const H = 210;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', class: 'diagram venn', role: 'img', 'aria-label': 'Venn' },
    s('circle', { cx: 135, cy: 105, r: 92, class: 'v1' }), s('circle', { cx: 225, cy: 105, r: 92, class: 'v2' }),
    s('text', { x: 90, y: 100, 'text-anchor': 'middle', class: 'v-t' }, v.sets[0].label),
    s('text', { x: 90, y: 122, 'text-anchor': 'middle', class: 'v-n' }, `${v.sets[0].items.length} 項`),
    s('text', { x: 180, y: 100, 'text-anchor': 'middle', class: 'v-t' }, v.overlap.label),
    s('text', { x: 180, y: 122, 'text-anchor': 'middle', class: 'v-n' }, `${v.overlap.items.length} 項`),
    s('text', { x: 270, y: 100, 'text-anchor': 'middle', class: 'v-t' }, v.sets[1].label),
    s('text', { x: 270, y: 122, 'text-anchor': 'middle', class: 'v-n' }, `${v.sets[1].items.length} 項`));
  const btns = h('div', { class: 'seg3' },
    h('button', { type: 'button', class: 'btn ghost c-crs', onclick: () => onPick(v.sets[0]) }, v.sets[0].label),
    h('button', { type: 'button', class: 'btn ghost c-integ', onclick: () => onPick(v.overlap) }, v.overlap.label),
    h('button', { type: 'button', class: 'btn ghost c-carf', onclick: () => onPick(v.sets[1]) }, v.sets[1].label));
  return h('div', { class: 'venn-wrap' }, svg, btns);
}
