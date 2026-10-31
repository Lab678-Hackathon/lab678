/**
 * S04 장소 상세 (지도 보기 = 주 행동, 내 나들이에 저장 = 보조) · S08 지도와 도보 경로 · S06 저장 시트.
 * 대화 카드·상세·지도·저장이 같은 후보 id 를 써요. 확인 안 된 정보는 '확인 필요'로 보여요.
 * 도보 시간은 경로 계산이 성공했을 때만 보여요 (직선 거리를 걷는 시간처럼 쓰지 않아요).
 */
import { state, candidateById } from './state.js';
import { walkRoute } from './api.js';
import { isSignedIn, isSaved, savePlace, startDemo, savedPlaces } from './saved.js';
import { $, el, formatDate, formatTime, checkedAt, isDebug } from './util.js';

let map = null;
let mapLayers = [];
let walkTicket = 0;
let pendingSave = null; // 체험 시작 전 저장 요청 1회 보관

/** 대화 후보 또는 저장한 장소에서 찾기 */
export function placeById(id) {
  return candidateById(id) || savedPlaces().find((p) => p.id === id) || null;
}

/** 방문 날짜 한 줄 ("11월 1일 (일) 관람 검토 · 무료") */
function visitLine(c) {
  const r = state.lastRequest;
  const parts = [];
  if (r) parts.push(`${formatDate(r.start_at.slice(0, 10))} ${formatTime(r.start_at.slice(11, 16))}–${formatTime(r.end_at.slice(11, 16))} 관람 검토`);
  if (c.fee_type) parts.push(c.fee_type);
  return parts.join(' · ');
}

/** S04 */
export function renderPlace(id) {
  const c = placeById(id);
  const box = $('#s04-body');
  box.replaceChildren();
  $('#s04-actions').hidden = !c;
  if (!c) {
    box.append(el('h2', null, '장소 정보를 찾을 수 없어요'), el('p', 'muted', '대화로 돌아가서 다시 골라 주세요.'));
    return;
  }
  const hero = el('div', 'place-hero');
  hero.style.backgroundImage = `url(assets/${c.genre?.includes('전시') ? 'place-museum' : 'place-palace'}.jpg)`;
  hero.append(el('span', 'chat-card__imgnote', '분위기 사진 · 실제 장소 아님'));
  box.append(hero);
  if (isSaved(c.id)) box.append(el('p', 'badge badge--ok', '내 나들이에 저장했어요'));
  box.append(el('h2', 'place-title', c.title), el('p', 'muted', c.venue || '장소 이름 확인 필요'));
  const vl = visitLine(c);
  if (vl) box.append(el('p', 'place-visit', vl));
  if (isDebug()) box.append(el('code', 'debug-id', `장소 ID: ${c.id}`));

  const info = el('div', 'info');
  const row = (label, value) => {
    const r = el('div', 'info__row');
    const t = el('div');
    t.append(el('span', 'info__label', label), value ? el('strong', null, value) : el('strong', 'muted', '정보 없음'));
    r.append(t);
    if (!value) r.append(el('span', 'badge badge--warn', '확인 필요'));
    info.append(r);
  };
  row('운영시간', c.opening_info);
  if (c.event_start_date || c.event_end_date) row('행사 기간', `${c.event_start_date || '?'} ~ ${c.event_end_date || '?'}`);
  row('관람료', c.price_info || (c.fee_type === '무료' ? '무료' : null));
  if (c.district) row('지역', c.district);
  row('대상', c.audience);
  row('거리', c.distance_km != null ? `출발지에서 직선 약 ${c.distance_km}km (걷는 시간 아님)` : null);
  box.append(info);

  const checks = c.checks_required || [];
  if (checks.length) {
    const tip = el('div', 'checklist');
    tip.append(el('strong', null, '가기 전에 확인해 주세요'));
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

  $('#s04-map').dataset.go = `/map/${encodeURIComponent(c.id)}`;
  const saveBtn = $('#s04-save');
  saveBtn.dataset.id = c.id;
  const saved = isSaved(c.id);
  saveBtn.textContent = saved ? '내 나들이 보기' : '내 나들이에 저장';
  saveBtn.disabled = false;
  $('#s04-note').hidden = true;
}

/* ---------------- 저장 (S06) ---------------- */

function note(text, warn = false) {
  const n = $('#s04-note');
  n.textContent = text;
  n.classList.toggle('is-warn', warn);
  n.hidden = false;
}

/** 저장 실행 1회 */
function doSave(id) {
  const c = placeById(id);
  if (!c) return;
  const r = savePlace(c);
  if (r === 'failed') { note('저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 눌러 주세요.', true); return; }
  renderPlace(id);
  note(r === 'already' ? '이미 내 나들이에 있어요.' : '내 나들이에 저장했어요. 이 브라우저에서만 볼 수 있어요.');
}

function openSheet() { $('#sheet-save').hidden = false; $('#sheet-save .sheet__panel').focus(); }
function closeSheet() { $('#sheet-save').hidden = true; }

/* ---------------- 지도 (S08) ---------------- */

function clearMap() { mapLayers.forEach((l) => l.remove()); mapLayers = []; }

/** S08 */
export async function renderMap(id) {
  const c = placeById(id);
  const from = state.lastRequest?.start_location || null;
  $('#s08-title').textContent = c ? `${from?.label || '출발지'} → ${c.venue || c.title}` : '장소를 찾을 수 없어요';
  $('#s08-back').dataset.go = c ? `/place/${encodeURIComponent(c.id)}` : '/chat';
  const result = $('#s08-result');
  const sub = $('#s08-sub');
  const err = $('#s08-error');
  err.hidden = true;
  result.textContent = '';
  sub.textContent = '';
  if (!c) return;
  const kakao = `https://map.kakao.com/link/to/${encodeURIComponent(c.venue || c.title)},${c.lat},${c.lng}`;
  $('#s08-kakao').href = kakao;
  $('#s08-kakao-transit').href = kakao;

  // 지도
  try {
    if (!window.L) throw new Error('map');
    if (!map) {
      map = L.map($('#s08-mapbox'), { zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    }
    clearMap();
    const pts = [[c.lat, c.lng]];
    mapLayers.push(L.marker([c.lat, c.lng], { icon: L.divIcon({ className: 'pin pin--to', html: '<span>도착</span>', iconSize: [56, 32], iconAnchor: [28, 16] }) }).addTo(map));
    if (from) {
      pts.push([from.lat, from.lng]);
      mapLayers.push(L.marker([from.lat, from.lng], { icon: L.divIcon({ className: 'pin pin--from', html: '<span>출발</span>', iconSize: [56, 32], iconAnchor: [28, 16] }) }).addTo(map));
    }
    map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    setTimeout(() => map.invalidateSize(), 60);
  } catch {
    $('#s08-maperr').hidden = false;
  }

  if (!from) { sub.textContent = '출발지가 없어서 경로를 찾을 수 없어요. 대화에서 출발지를 정해 주세요.'; return; }
  setMode('walk');
  const mine = ++walkTicket;
  result.textContent = '도보 경로를 찾고 있어요…';
  const r = await walkRoute({ lat: from.lat, lng: from.lng }, { lat: c.lat, lng: c.lng });
  if (mine !== walkTicket) return;
  if (r.kind !== 'ready') {
    result.textContent = '도보 경로를 확인하지 못했어요';
    err.hidden = false;
    $('#s08-errmsg').textContent = `${r.message} 걷는 시간은 경로를 확인했을 때만 알려 드려요.`;
    sub.textContent = c.distance_km != null ? `직선 거리 약 ${c.distance_km}km (걷는 시간 아님)` : '';
    return;
  }
  const min = Math.round(r.duration_s / 60);
  const km = (r.distance_m / 1000).toFixed(1);
  result.textContent = `도보 약 ${min}분`;
  sub.textContent = `약 ${km}km${min > 40 ? ' · 걷는 시간이 긴 경로예요. 대중교통도 확인해 보세요.' : ''}`;
  $('#s08-credit').textContent = `도보 경로 ${r.provider || 'Valhalla / FOSSGIS'} · 지도 © OpenStreetMap`;
  if (map && Array.isArray(r.path) && r.path.length > 1) {
    const line = L.polyline(r.path, { color: '#1E5B43', weight: 6, opacity: 0.85 }).addTo(map);
    mapLayers.push(line);
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }
}

function setMode(mode) {
  document.querySelectorAll('#s08 [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  $('#s08-walk').hidden = mode !== 'walk';
  $('#s08-transit').hidden = mode !== 'transit';
}

/** 이벤트 연결 (한 번) */
export function initPlace() {
  $('#s04-save').addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    if (isSaved(id)) { location.hash = '/me'; return; }
    if (isSignedIn()) { doSave(id); return; }
    pendingSave = id; // 체험 시작 후 자동 1회 실행
    openSheet();
  });
  $('#sheet-start').addEventListener('click', () => {
    const id = pendingSave;
    pendingSave = null;
    closeSheet();
    if (!startDemo()) { note('체험을 시작하지 못했어요. 브라우저 저장이 막혀 있는지 확인해 주세요.', true); return; }
    document.dispatchEvent(new CustomEvent('demo-changed'));
    if (id) doSave(id);
  });
  $('#sheet-cancel').addEventListener('click', () => { pendingSave = null; closeSheet(); note('저장하지 않았어요. 언제든 다시 누르면 돼요.'); });
  $('#sheet-save').addEventListener('click', (e) => { if (e.target.id === 'sheet-save') { pendingSave = null; closeSheet(); } });
  document.querySelectorAll('#s08 [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#s08-retry').addEventListener('click', () => { const id = decodeURIComponent(location.hash.split('/')[2] || ''); renderMap(id); });
}

