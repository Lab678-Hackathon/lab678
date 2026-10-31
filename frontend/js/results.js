/**
 * S03 추천 결과(위 지도 + 아래 카드)와 S04 장소 상세.
 * S03 카드와 S04 상세는 같은 후보 객체(id 기준)를 써요. 확인 안 된 정보는 '확인 필요'로 표시해요.
 */
import { state, save, candidateById } from './state.js';
import { requestRecommend, testMode } from './api.js';
import { formatDate, formatTime } from './search.js';

const $ = (sel) => document.querySelector(sel);
const debug = () => new URLSearchParams(location.search).has('debug');
let map = null;
let markers = new Map();

/** 텍스트만 안전하게 넣는 작은 요소 생성기 */
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

/** 확인 필요 배지 */
const warn = (text) => el('span', 'badge badge--warn', text);

/** "2026-10-31T06:27:57+09:00" → "10월 31일 06:27 기준" */
function checkedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())} 기준`;
}

/** 위 칩: 지금 적용된 조건 */
function renderConditions() {
  const r = state.confirmed;
  const box = $('#s03-conditions');
  box.replaceChildren();
  if (!r) return;
  box.append(el('span', 'chip chip--static', `${r.start_location.label} 출발`),
    el('span', 'chip chip--static', `${formatDate(state.form.date)} ${formatTime(state.form.startTime)}–${formatTime(state.form.endTime)}`),
    el('span', 'chip chip--static', r.category));
}

/** 카드 하나 */
function card(c, index) {
  const art = el('article', 'place-card');
  art.dataset.id = c.id;
  art.tabIndex = 0;
  art.setAttribute('aria-label', `${index + 1}번 ${c.title}`);
  const head = el('div', 'place-card__head');
  head.append(el('span', 'num', String(index + 1)), el('h3', null, c.title));
  art.append(head, el('p', 'muted', c.venue || '장소 이름 확인 필요'));
  const meta = el('div', 'place-card__meta');
  meta.append(el('span', null, c.distance_km != null ? `출발지에서 직선 약 ${c.distance_km}km` : '거리 확인 필요'));
  if (c.fee_type) meta.append(el('span', null, c.fee_type));
  art.append(meta);
  const badges = el('div', 'badges');
  if (!c.opening_info) badges.append(warn('운영시간 확인 필요'));
  if (!c.price_info) badges.append(warn('가격 확인 필요'));
  (c.checks_required || []).forEach((t) => badges.append(warn(t)));
  art.append(badges);
  if (debug()) art.append(el('code', 'debug-id', `후보 ID: ${c.id}`));
  const more = el('button', 'btn btn--outline btn--small', '자세히 보기');
  more.type = 'button';
  more.dataset.go = `/place/${encodeURIComponent(c.id)}`;
  art.append(more);
  return art;
}

/** 활성 카드·마커 표시 (지도 번호와 카드가 같이 움직여요) */
function setActive(id, scroll) {
  state.activeId = id;
  save();
  document.querySelectorAll('#s03-list .place-card').forEach((n) => n.classList.toggle('is-active', n.dataset.id === id));
  markers.forEach((m, mid) => m.getElement()?.classList.toggle('is-active', mid === id));
  if (scroll) document.querySelector(`#s03-list [data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** 지도. 지도만 실패하면 카드는 그대로 두고 지도 자리에서 다시 보기 (D12) */
function renderMap(list) {
  const box = $('#s03-map');
  const fail = $('#s03-map-error');
  fail.hidden = true;
  const points = list.filter((c) => c.lat != null && c.lng != null);
  try {
    if (!window.L) throw new Error('map library');
    if (!map) {
      map = L.map(box, { zoomControl: false, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    }
    markers.forEach((m) => m.remove());
    markers = new Map();
    const start = state.confirmed?.start_location;
    const bounds = [];
    if (start) {
      L.circleMarker([start.lat, start.lng], { radius: 8, color: '#1E5B43', fillColor: '#fff', fillOpacity: 1, weight: 3 }).addTo(map);
      bounds.push([start.lat, start.lng]);
    }
    points.forEach((c) => {
      const i = list.indexOf(c);
      const icon = L.divIcon({ className: 'pin', html: `<span>${i + 1}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] });
      const m = L.marker([c.lat, c.lng], { icon, title: c.title }).addTo(map);
      m.on('click', () => setActive(c.id, true));
      markers.set(c.id, m);
      bounds.push([c.lat, c.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [36, 36] });
    setTimeout(() => map.invalidateSize(), 50);
  } catch {
    fail.hidden = false;
  }
}

/** S03 을 그려요. 결과가 없으면 S02 로 돌려보내요. */
export function renderResults() {
  const res = state.result;
  if (!res) { location.hash = '/search'; return; }
  renderConditions();
  $('#s03-mode').hidden = testMode() !== 'recorded';
  $('#s03-source').textContent = res.source_checked_at ? `서울시 문화행사 정보 · ${checkedAt(res.source_checked_at)}` : '';
  $('#s03-notice').hidden = true;
  const list = res.candidates || [];
  const empty = list.length === 0;
  $('#s03-empty').hidden = !empty;
  $('#s03-found').hidden = empty;
  $('#s03-map-wrap').hidden = empty;
  $('#s03-more').hidden = empty;
  if (empty) return;
  $('#s03-count').textContent = `추천 장소 ${list.length}곳`;
  $('#s03-list').replaceChildren(...list.map(card));
  renderMap(list);
  setActive(state.activeId && list.some((c) => c.id === state.activeId) ? state.activeId : list[0].id, false);
}

/** 다른 곳 찾기: 같은 조건으로 다시 찾고, 처음 보는 곳만 보여줘요. 없으면 지금 카드 유지 (D07·D08) */
async function findMore() {
  const btn = $('#s03-more');
  const notice = $('#s03-notice');
  btn.disabled = true;
  btn.textContent = '찾고 있어요…';
  const res = await requestRecommend(state.confirmed);
  btn.disabled = false;
  btn.textContent = '다른 곳 찾기';
  notice.hidden = false;
  if (res.kind === 'ready') {
    const fresh = res.data.candidates.filter((c) => !state.shownIds.includes(c.id));
    if (fresh.length) {
      state.result = { ...res.data, candidates: fresh };
      state.shownIds.push(...fresh.map((c) => c.id));
      state.activeId = fresh[0].id;
      save();
      renderResults();
      notice.hidden = false;
      notice.textContent = '같은 조건으로 새로 찾은 곳이에요.';
      return;
    }
  }
  notice.textContent = res.kind === 'error'
    ? '새로 찾지 못했어요. 지금 보시는 곳은 그대로 둘게요.'
    : '같은 조건으로 더 찾은 곳이 없어요. 지금 보시는 곳은 그대로 둘게요.';
}

/** S04 장소 상세 */
export function renderPlace(id) {
  const c = candidateById(id);
  const box = $('#s04-body');
  box.replaceChildren();
  $('#s04-actions').hidden = !c;
  if (!c) {
    box.append(el('h2', null, '장소 정보를 찾을 수 없어요'), el('p', 'muted', '추천 목록에서 다시 골라 주세요.'));
    return;
  }
  if (c.genre) box.append(el('span', 'badge badge--ok', c.genre));
  box.append(el('h2', 'place-title', c.title), el('p', 'muted', c.venue || '장소 이름 확인 필요'));
  if (debug()) box.append(el('code', 'debug-id', `장소 ID: ${c.id}`));

  const info = el('div', 'info');
  const row = (label, value) => {
    const r = el('div', 'info__row');
    const t = el('div');
    t.append(el('span', 'info__label', label), value ? el('strong', null, value) : el('strong', 'muted', '정보 없음'));
    r.append(t);
    if (!value) r.append(warn('확인 필요'));
    info.append(r);
  };
  if (c.event_start_date || c.event_end_date) row('행사 기간', `${c.event_start_date || '?'} ~ ${c.event_end_date || '?'}`);
  row('운영시간', c.opening_info);
  if ('district' in c) row('지역', c.district);
  row('가격', c.price_info);
  if (c.fee_type) row('요금 구분', c.fee_type);
  row('대상', c.audience);
  row('거리', c.distance_km != null ? `출발지에서 직선 약 ${c.distance_km}km (실제 이동시간 아님)` : null);
  box.append(info);

  const checks = c.checks_required || [];
  if (checks.length) {
    const tip = el('div', 'checklist');
    tip.append(el('strong', null, '방문 전 확인할 사항'));
    const ul = el('ul');
    checks.forEach((t) => ul.append(el('li', null, t)));
    tip.append(ul);
    box.append(tip);
  }
  if (c.official_url) {
    const a = el('a', 'link-btn', '공식 안내 페이지 보기');
    a.href = c.official_url;
    a.target = '_blank';
    a.rel = 'noopener';
    box.append(a);
  }
  if (c.source_checked_at) box.append(el('p', 'caption muted', `서울시 문화행사 정보 · ${checkedAt(c.source_checked_at)}`));

  const pick = $('#s04-pick');
  const picked = state.selectedId === c.id;
  pick.textContent = picked ? '선택했어요' : '이 장소 선택';
  pick.classList.toggle('btn--secondary', picked);
  pick.classList.toggle('btn--primary', !picked);
  pick.dataset.id = c.id;
  $('#s04-save-note').hidden = true;
}

/** S03·S04 이벤트 연결. 한 번만 불러요. */
export function initResults() {
  $('#s03-list').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.place-card');
    if (cardEl && !e.target.closest('[data-go]')) setActive(cardEl.dataset.id, false);
  });
  $('#s03-more').addEventListener('click', findMore);
  $('#s03-map-retry').addEventListener('click', () => renderMap(state.result?.candidates || []));
  $('#s04-pick').addEventListener('click', (e) => {
    state.selectedId = e.currentTarget.dataset.id;
    save();
    renderPlace(state.selectedId);
  });
  $('#s04-save').addEventListener('click', () => { $('#s04-save-note').hidden = false; });
}
