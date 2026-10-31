import { pickSeason, startLeaves } from './landing.js';
import { wakeServer } from './api.js';
import { initSearch, renderSearch } from './search.js';
import { initResults, renderResults, renderPlace } from './results.js';

/** 브라우저 저장 키 (화면명세서 S06 개념 이름 기준, 최종 키는 개발 협의) */
const KEYS = {
  signedIn: 'demoSignedIn',
  savedPick: 'demo_saved_pick',
  savedRoute: 'demo_saved_route',
  textLarge: 'text_large',
};

/** 까치가 일어나는 모습을 최소한 이만큼은 보여줘요 (너무 빨리 넘어가면 깜빡이는 느낌) */
const MIN_WAKE_MS = 1600;

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

/**
 * 까치가 말하는 동안 움직이게 해요 (말풍선이 나올 때). 시간이 지나면 다시 숨쉬기로 돌아가요.
 * @param {HTMLElement} el 까치 이미지를 감싼 요소
 * @param {number} ms
 */
export function talkFor(el, ms) {
  if (!el) return;
  el.classList.add('is-talking');
  clearTimeout(el._talkTimer);
  el._talkTimer = setTimeout(() => el.classList.remove('is-talking'), ms);
}

/**
 * S00 까치 깨우기. 열자마자 서버를 미리 깨우기 시작하고(조용히),
 * 사용자가 까치나 버튼을 누르면 일어나는 모습 → 서버가 답하면 인사로 바꿔요.
 * 서버가 끝내 답하지 않으면 다시 깨우기를 보여줘요 (Mock 으로 넘어가지 않음).
 */
function initLanding() {
  const season = pickSeason();
  startLeaves(document.querySelector('#s00 .leaves'), season === 'none' ? 'autumn' : season, 8);

  const box = document.querySelector('#s00 .wake');
  const img = document.querySelector('#wake-img');
  const title = document.querySelector('#wake-title');
  const sub = document.querySelector('#wake-sub');
  const dots = document.querySelector('#wake-dots');
  const btn = document.querySelector('#wake-btn');
  const bubble = document.querySelector('#wake-bubble');
  const talk = document.querySelectorAll('#s00 [data-talk]');
  let pending = wakeServer();

  const show = (state) => {
    box.dataset.state = state;
    dots.hidden = state !== 'waking';
    bubble.hidden = state !== 'ready';
    talk.forEach((b) => { b.hidden = state !== 'ready'; });
    btn.hidden = state === 'ready';
    btn.disabled = state === 'waking';
    if (state === 'sleep' || state === 'tired') {
      img.src = 'assets/kkachi-sleep.png';
      img.alt = '빨간 목도리를 두른 까치가 단풍 가지에서 자고 있어요';
    }
    if (state === 'sleep') {
      title.textContent = '까치가 아직 자고 있어요';
      sub.innerHTML = '톡 눌러서 깨워 주세요.<br>깨우면 오늘 나들이를 같이 찾아요.';
      btn.textContent = '까치 깨우기';
      btn.className = 'btn btn--primary';
    }
    if (state === 'waking') {
      img.src = 'assets/kkachi-wake.png';
      img.alt = '까치가 날개를 펴고 기지개를 켜고 있어요';
      title.textContent = '까치가 기지개를 켜고 있어요';
      sub.innerHTML = '잠깐만 기다려 주세요.<br>처음엔 30초~1분쯤 걸릴 수 있어요.';
      btn.textContent = '일어나는 중…';
      btn.className = 'btn btn--secondary';
    }
    if (state === 'tired') {
      title.textContent = '까치가 아직 못 일어났어요';
      sub.innerHTML = '연결이 늦어지고 있어요.<br>다시 깨워 보거나, 조금 뒤에 다시 와 주세요.';
      btn.textContent = '다시 깨우기';
      btn.className = 'btn btn--primary';
    }
    if (state === 'ready') {
      img.src = 'assets/kkachi-hello.png';
      img.alt = '까치가 날개를 흔들며 인사해요';
      title.textContent = '';
      sub.textContent = '';
    }
    title.hidden = state === 'ready';
    sub.hidden = state === 'ready';
  };

  const wake = async () => {
    if (box.dataset.state === 'waking' || box.dataset.state === 'ready') return;
    if (box.dataset.state === 'tired') pending = wakeServer();
    show('waking');
    const [ok] = await Promise.all([pending, new Promise((r) => setTimeout(r, MIN_WAKE_MS))]);
    show(ok ? 'ready' : 'tired');
    if (ok) talkFor(document.querySelector('#s00 .wake__bird'), 2600);
  };

  document.querySelectorAll('#s00 [data-wake]').forEach((el) => el.addEventListener('click', wake));
  show('sleep');
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
