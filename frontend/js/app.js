import { pickSeason, setSeasonArt, startLeaves } from './landing.js';
import { initSearch, renderSearch } from './search.js';
import { initResults, renderResults, renderPlace } from './results.js';

/** 브라우저 저장 키 (화면명세서 S06 개념 이름 기준, 최종 키는 개발 협의) */
const KEYS = {
  signedIn: 'demoSignedIn',
  savedPick: 'demo_saved_pick',
  savedRoute: 'demo_saved_route',
  textLarge: 'text_large',
};

/** 시작 화면을 최소한 이만큼은 보여줘요 (너무 빨리 넘어가면 깜빡이는 느낌) */
const MIN_LANDING_MS = 1200;

/**
 * localStorage 를 안전하게 읽어요. 막혀 있거나 값이 깨졌으면 null.
 * @param {string} key
 * @returns {any}
 */
function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * localStorage 에 안전하게 써요. 실패하면 false.
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * 주소의 # 뒤를 보고 화면 하나만 보여줘요.
 * #/ 또는 없음 = S00 시작 화면, #/home = S01, #/search = S02(+S02a), #/results = S03,
 * #/place/<후보 id> = S04, #/me = S07
 */
function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const id = path.startsWith('/place/') ? 's04'
    : { '/': 's00', '/home': 's01', '/search': 's02', '/results': 's03', '/me': 's07' }[path] || 's01';
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('is-active', el.id === id));
  document.querySelectorAll('.tab').forEach((tab) => {
    if (tab.dataset.go === path) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  document.querySelector('.tabbar').hidden = !['s01', 's07'].includes(id);
  if (id === 's01') renderHome();
  if (id === 's02') renderSearch();
  if (id === 's03') renderResults();
  if (id === 's04') renderPlace(decodeURIComponent(path.slice('/place/'.length)));
  window.scrollTo(0, 0);
}

/** S00: 계절 그림과 잎을 켜고, 준비가 끝나면 '준비하고 있어요'를 시작하기 버튼으로 바꿔요. */
function initLanding() {
  const season = pickSeason();
  setSeasonArt(document.querySelector('#s00 .landing__art img'), season);
  startLeaves(document.querySelector('#s00 .leaves'), season);

  const started = performance.now();
  const ready = () => {
    const wait = Math.max(0, MIN_LANDING_MS - (performance.now() - started));
    setTimeout(() => {
      document.querySelector('#s00 .loading').hidden = true;
      document.querySelector('#s00 [data-start]').hidden = false;
    }, wait);
  };
  // 나중에 백엔드 상태 확인(/health 등)이 생기면 여기서 기다려요.
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready, { once: true });
}

/**
 * S01: 체험 중 표시와 저장 미리보기를 브라우저 저장 내용대로 그려요.
 * 저장이 없으면 미리보기를 숨기고 말하기 예시를 보여줘요 (D06).
 */
function renderHome() {
  const signedIn = readStore(KEYS.signedIn) === true;
  const pick = readStore(KEYS.savedPick);
  const course = readStore(KEYS.savedRoute);
  const items = [];
  if (Array.isArray(pick) && pick[0]) items.push({ img: pick[0].image || 'assets/place-museum.jpg', title: pick[0].name, meta: '내가 고른 장소' });
  if (Array.isArray(course) && course[0]) items.push({ img: course[0].image || 'assets/place-craft.jpg', title: course[0].name, meta: `내 나들이 코스 · ${course[0].stops?.length || 0}곳` });

  document.querySelector('#s01 [data-signed-in]').hidden = !signedIn;
  const saved = document.querySelector('#s01 [data-saved]');
  const tip = document.querySelector('#s01 [data-tip]');
  saved.hidden = items.length === 0;
  tip.hidden = items.length > 0;
  saved.querySelector('[data-list]').replaceChildren(...items.map((it) => {
    const row = document.createElement('button');
    row.className = 'saved-row';
    row.type = 'button';
    row.dataset.go = '/me';
    row.innerHTML = `<img src="${it.img}" alt=""><span class="saved-row__text"><strong></strong><span></span></span>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
    row.querySelector('strong').textContent = it.title;
    row.querySelector('.saved-row__text > span').textContent = it.meta;
    return row;
  }));
}

/** 글자 크게: 앱 전체 글자를 15% 키우고, 다음에 열어도 기억해요. */
function initTextSize() {
  const root = document.documentElement;
  const apply = (on) => {
    root.classList.toggle('text-large', on);
    document.querySelectorAll('[data-text-size]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  };
  apply(readStore(KEYS.textLarge) === true);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-text-size]')) return;
    const on = !root.classList.contains('text-large');
    apply(on);
    writeStore(KEYS.textLarge, on);
  });
}

/** data-go 가 붙은 버튼을 누르면 해당 화면으로 이동해요. */
function initNavigation() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-go]');
    if (target) location.hash = target.dataset.go;
  });
  window.addEventListener('hashchange', route);
}

initTextSize();
initNavigation();
initSearch();
initResults();
initLanding();
route();
