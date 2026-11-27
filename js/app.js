// Boot, router, layout (sidebar on wide screens), service worker.
import { h, icon, closeSheets } from './ui.js?v=v7';
import { D, P, loadContent, loadProgress, save, nav, route, unreadNews, TRACK } from './state.js?v=v7';
import * as S from './screens.js?v=v7';
import { renderPlay } from './play.js?v=v7';
import { renderReader } from './reader.js?v=v7';

const NAV = [
  ['#/home', 'home', '主畫面'], ['#/tonight', 'play', '今晚一局'], ['#/games', 'games', '遊戲中心'], ['#/map', 'map', '知識地圖'], ['#/glossary', 'abc', '詞彙表'],
  ['#/case', 'case', '大案進度'], ['#/news', 'news', '新例速遞'], ['#/badges', 'badge', '徽章分數'], ['#/library', 'book', '資料庫'], ['#/settings', 'gear', '設定'],
];

function parse() {
  const raw = (location.hash || '#/home').slice(2);
  const parts = raw.split('/').map((x) => decodeURIComponent(x));
  return { name: parts[0] || 'home', a: parts[1], b: parts[2] };
}

function sidebar(cur) {
  return h('nav', { class: 'side', 'aria-label': '主要' },
    h('div', { class: 'side-brand' }, h('b', null, 'CRS 2.0 · CARF'), h('span', null, '學習遊戲')),
    h('div', { class: 'side-routes' }, Object.keys(TRACK).map((t) => h('button', { type: 'button', class: 'side-r r-' + t + (route() === t ? ' on' : ''), onclick: () => { P.route = t; save(); render(); } }, TRACK[t].short))),
    NAV.map(([hash, ic, label]) => h('a', { href: hash, class: 'side-i' + ('#/' + cur === hash ? ' on' : ''), 'aria-current': '#/' + cur === hash ? 'page' : null }, icon(ic, 20), h('span', null, label), hash === '#/news' && unreadNews().length ? h('span', { class: 'dot-s' }, String(unreadNews().length)) : null)));
}

function render() {
  const { name, a, b } = parse();
  closeSheets();
  const app = document.getElementById('app');
  const view = h('main', { id: 'view', class: 'view v-' + name, tabindex: '-1' });
  // screens append optional parts; drop null/false instead of printing "null"
  view.append = (...kids) => HTMLElement.prototype.append.apply(view, kids.flat(Infinity).filter((k) => k != null && k !== false && k !== true));
  const R = {
    home: () => S.renderHome(view), tonight: () => S.renderTonight(view), play: () => renderPlay(view), level: () => S.renderLevel(view, a),
    games: () => S.renderGames(view, a), roles: () => S.renderRoles(view), trees: () => S.renderTrees(view), flash: () => S.renderFlash(view),
    mini: () => S.renderMini(view), bank: () => S.renderBank(view), challenge: () => S.renderChallenge(view), adventure: () => S.renderAdventure(view),
    compare: () => S.renderCompare(view), map: () => S.renderMap(view, a), case: () => S.renderCase(view), news: () => S.renderNews(view),
    badges: () => S.renderBadges(view), library: () => S.renderLibrary(view), settings: () => S.renderSettings(view), reader: () => renderReader(view, a, b), glossary: () => S.renderGlossary(view),
  };
  (R[name] || R.home)();
  app.replaceChildren(sidebar(name), view);
  document.body.dataset.screen = name;
  trackHead();
  document.body.dataset.route = route();
}

// expose the sticky header height as --head-h (used by scroll-padding / scroll-margin so nothing lands under it)
let headRO = null;
function trackHead() {
  const hd = document.querySelector('#view .scr-head');
  const set = () => document.documentElement.style.setProperty('--head-h', (hd ? Math.ceil(hd.getBoundingClientRect().height) : 0) + 'px');
  if (headRO) headRO.disconnect();
  if (hd && 'ResizeObserver' in window) { headRO = new ResizeObserver(set); headRO.observe(hd); }
  set();
}
export function headBottom() { const hd = document.querySelector('#view .scr-head'); return hd ? hd.getBoundingClientRect().bottom : 0; }
let lastHash = location.hash;
async function boot() {
  loadProgress();
  S.applyFont();
  await loadContent();
  window.addEventListener('hashchange', () => { const nh = location.hash; const scroll = nh !== lastHash; lastHash = nh; render(); if (scroll) window.scrollTo(0, 0); });
  window.addEventListener('rerender', () => { const y = window.scrollY; render(); window.scrollTo(0, y); });
  render();
  if (window.__amReady) window.__amReady();
  registerSW();
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  // a new worker took over: reload once so all files come from the same build (progress is untouched)
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController || !navigator.serviceWorker.controller) return;
    reloaded = true;
    if (!P.session || P.session.pos >= P.session.queue.length) location.reload();
  });
}

window.__BUILD__ = 'v7';
boot().catch((err) => { console.error(err); if (window.__amFail) window.__amFail(err); });
