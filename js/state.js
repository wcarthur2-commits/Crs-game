// App state: content (D), progress (P, localStorage only), indexes, navigation.
import { emptyProgress, dayKey } from './engine.js?v=v5';

export const STORE_KEY = 'crs-game-progress-v1';
export const D = {};
export const IX = { el: {}, lv: {}, q: {}, fc: {}, tree: {}, prov: {}, src: {}, news: {}, dg: {}, role: {}, ind: {}, badge: {}, term: {} };
export let P = emptyProgress();
export let storageOk = true;

export const REQUIRED = ['meta', 'elements', 'provisions', 'levels', 'quiz', 'flashcards', 'trees', 'diagrams', 'case', 'news',
  'timeline', 'comparison', 'library', 'badges', 'roles', 'industries', 'sources', 'sessions', 'unverified', 'changelog', 'terms'];

export const TRACK = {
  CRS2: { short: 'CRS 2.0', color: 'var(--crs)', icon: 'bank' },
  CARF: { short: 'CARF', color: 'var(--carf)', icon: 'coin' },
  INTEG: { short: '一併管理', color: 'var(--integ)', icon: 'merge' },
};
export const trackName = (t) => (D.meta && D.meta.tracks && D.meta.tracks[t]) || (TRACK[t] && TRACK[t].short) || t;

export async function loadContent() {
  const metaRes = await fetch('./content/meta.json', { cache: 'no-cache' });
  if (!metaRes.ok) throw new Error('content/meta.json HTTP ' + metaRes.status);
  D.meta = await metaRes.json();
  const cv = encodeURIComponent(D.meta.content_version || '0');
  const names = REQUIRED.filter((n) => n !== 'meta');
  await Promise.all(names.map(async (n) => {
    const r = await fetch(`./content/${n}.json?cv=${cv}`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`content/${n}.json HTTP ${r.status}`);
    D[n] = await r.json();
  }));
  index();
}
function index() {
  const map = (arr, key = 'id') => Object.fromEntries((arr || []).map((x) => [x[key], x]));
  IX.el = map(D.elements.items); IX.lv = map(D.levels.items); IX.q = map(D.quiz.items); IX.fc = map(D.flashcards.items);
  IX.tree = map(D.trees.items); IX.prov = map(D.provisions.items); IX.src = D.sources.items || {}; IX.news = map(D.news.items);
  IX.dg = map(D.diagrams.items); IX.role = map(D.roles.items); IX.ind = map(D.industries.items); IX.badge = map(D.badges.items);
  IX.adv = map(D.quiz.adventure || []); IX.term = map(D.terms.items);
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) P = Object.assign(emptyProgress(), JSON.parse(raw));
  } catch (e) { storageOk = false; }
  return P;
}
export function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); storageOk = true; } catch (e) { storageOk = false; }
}

export const route = () => (TRACK[P.route] ? P.route : 'CRS2');
export function setRoute(r) { P.route = r; save(); window.dispatchEvent(new Event('rerender')); }

export function nav(hash) { if (location.hash === hash) window.dispatchEvent(new Event('rerender')); else location.hash = hash; }

// changelog "new" markers: only non-baseline entries from the last RECENT_DAYS count as new
export const RECENT_DAYS = 7;
export const logKey = (e) => `${e.date}|${e.file}|${e.item_id}|${e.change}`;
export function recentCut() { const d = new Date(); d.setDate(d.getDate() - RECENT_DAYS); return dayKey(d); }
export const liveLog = () => { const cut = recentCut(); return (D.changelog.entries || []).filter((e) => e.baseline !== true && e.date > cut); };
export const unseenLog = () => liveLog().filter((e) => !P.seenLog[logKey(e)]);
export const isNewItem = (id) => liveLog().some((e) => e.item_id === id && e.change !== 'removed' && !P.seenLog[logKey(e)]);
export const unreadNews = () => D.news.items.filter((n) => !P.newsRead[n.id]);
export function sourceInfo(id) { return id ? IX.src[id] || null : null; }
