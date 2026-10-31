/**
 * S02 나들이 찾기 + S02a 조건 확인(S02 화면 안에서 펼침).
 * 입력은 바로 저장해서 화면을 오가도 그대로 남고, 값을 바꾸면 확인을 다시 받아요.
 */
import { state, save } from './state.js';
import { requestRecommend, testMode } from './api.js';

/** 출발지 예시 (청량리역 좌표는 docs/development/examples/outing-request.json 과 같아요) */
export const START_PLACES = {
  cheongnyangni: { label: '청량리역', lat: 37.5805961, lng: 127.0482573 },
  seoulstation: { label: '서울역', lat: 37.554648, lng: 126.970631 },
};
const MIN_MINUTES = 60;
const MSG = {
  start: '출발지를 골라 주세요.',
  here: '위치를 쓸 수 없어요. 출발지를 골라 주세요.',
  date: '날짜를 골라 주세요.',
  timeMissing: '출발 시각과 끝나는 시각을 골라 주세요.',
  timeOrder: '끝나는 시각을 출발 시각보다 늦게 정해 주세요.',
  timeMin: '나들이 시간은 최소 1시간 이상으로 설정해 주세요.',
  category: '보고 싶은 것을 하나 골라 주세요.',
};

let ticket = 0; // 늦게 온 응답이 최신 요청을 덮어쓰지 않게
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/** "HH:MM" 을 분으로 */
const minutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/**
 * "2026-10-31" → "10월 31일 (토)"
 * @param {string} iso
 */
export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  const w = '일월화수목금토'[d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
}

/** "14:00" → "오후 2:00" */
export function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
}

/** 현재 출발지 정보 (예시 장소 또는 현재 위치) */
function startPlace() {
  if (state.form.startKey === 'here') return state.form.here ? { label: '현재 위치', ...state.form.here } : null;
  return START_PLACES[state.form.startKey] || null;
}

/**
 * 입력값을 검사해요. 오류는 칸별로 돌려주고, 통과하면 백엔드 요청 형식을 만들어요.
 * @returns {{errors: Record<string,string>, request: object|null}}
 */
function validate() {
  const f = state.form;
  const errors = {};
  const place = startPlace();
  if (!place) errors.start = MSG.start;
  if (!f.date) errors.date = MSG.date;
  if (!f.startTime || !f.endTime) errors.time = MSG.timeMissing;
  else if (minutes(f.endTime) <= minutes(f.startTime)) errors.time = MSG.timeOrder;
  else if (minutes(f.endTime) - minutes(f.startTime) < MIN_MINUTES) errors.time = MSG.timeMin;
  if (!f.category) errors.category = MSG.category;
  if (Object.keys(errors).length) return { errors, request: null };
  return {
    errors,
    request: {
      request_kind: f.kind,
      start_location: { label: place.label, lat: place.lat, lng: place.lng },
      start_at: `${f.date}T${f.startTime}:00+09:00`,
      end_at: `${f.date}T${f.endTime}:00+09:00`,
      category: f.category,
    },
  };
}

/** 칸 아래 오류 문구를 보여주거나 지워요 (D13: 팝업이 아니라 해당 칸 바로 아래) */
function showErrors(errors) {
  for (const key of ['start', 'date', 'time', 'category']) {
    const el = $(`#err-${key}`);
    el.textContent = errors[key] || '';
    el.hidden = !errors[key];
    $(`#s02 [data-field="${key}"]`)?.classList.toggle('has-error', Boolean(errors[key]));
  }
}

/** 입력값을 화면에 반영해요 */
function renderForm() {
  const f = state.form;
  $$('#s02 [data-start-key]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.startKey === f.startKey)));
  $$('#s02 [data-category]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.category === f.category)));
  $$('#s02 [data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === f.kind)));
  $('#f-date').value = f.date;
  $('#f-start').value = f.startTime;
  $('#f-end').value = f.endTime;
}

/** S02a 확인 영역을 확인한 요청값으로 채워요 */
function renderConfirm() {
  const r = state.confirmed;
  const box = $('#confirm');
  box.hidden = !r;
  $('#btn-search').textContent = r ? '확인하고 추천받기' : '나들이 추천받기';
  $('#confirm-error').hidden = true;
  if (!r) return;
  const rows = [
    ['start', '출발지', r.start_location.label],
    ['date', '날짜', formatDate(state.form.date)],
    ['time', '시간', `${formatTime(state.form.startTime)} – ${formatTime(state.form.endTime)}`],
    ['category', '보고 싶은 것', r.category],
    ['kind', '찾는 방식', r.request_kind === 'place' ? '장소 하나씩 보기' : '2~3곳 코스로'],
  ];
  $('#confirm-rows').replaceChildren(...rows.map(([key, label, value]) => {
    const row = document.createElement('div');
    row.className = 'confirm__row';
    row.innerHTML = '<div><span class="confirm__label"></span><strong></strong></div><button type="button" class="link-btn">수정하기</button>';
    row.querySelector('.confirm__label').textContent = label;
    row.querySelector('strong').textContent = value;
    row.querySelector('button').dataset.edit = key;
    return row;
  }));
  $('#confirm-mode').hidden = testMode() !== 'recorded';
}

/** 값이 바뀌면 확인을 다시 받아야 해요 */
function changed() {
  state.confirmed = null;
  save();
  renderConfirm();
}

/** 확인 → 추천 요청 → S03. 실패해도 Mock 으로 바꾸지 않고 같은 확인 화면에서 알려줘요. */
async function submit() {
  const btn = $('#btn-search');
  const mine = ++ticket;
  btn.disabled = true;
  btn.textContent = '추천을 찾고 있어요…';
  $('#confirm').classList.add('is-loading');
  $('#confirm-error').hidden = true;
  const res = await requestRecommend(state.confirmed);
  if (mine !== ticket) return;
  btn.disabled = false;
  $('#confirm').classList.remove('is-loading');
  if (res.kind === 'ready' || res.kind === 'no_results') {
    state.result = res.data;
    state.shownIds = res.data.candidates.map((c) => c.id);
    state.activeId = state.shownIds[0] || null;
    state.selectedId = null;
    save();
    btn.textContent = '확인하고 추천받기';
    location.hash = '/results';
    return;
  }
  const err = $('#confirm-error');
  err.textContent = res.message;
  err.hidden = false;
  btn.textContent = res.kind === 'error' ? '다시 시도' : '확인하고 추천받기';
}

/** 아래 버튼: 처음엔 검사 후 확인 영역을 펼치고, 펼쳐진 상태면 추천을 요청해요 */
function onPrimary() {
  if (state.confirmed) { submit(); return; }
  const { errors, request } = validate();
  showErrors(errors);
  if (!request) {
    const first = ['start', 'date', 'time', 'category'].find((k) => errors[k]);
    $(`#s02 [data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  state.confirmed = request;
  save();
  renderConfirm();
  $('#confirm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** 현재 위치 사용 (권한 거절·미지원이면 출발지 칸 아래 안내) */
function useHere() {
  if (!navigator.geolocation) { showErrors({ start: MSG.here }); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.form.here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.form.startKey = 'here';
      renderForm();
      showErrors({});
      changed();
    },
    () => showErrors({ start: MSG.here }),
    { timeout: 8000 },
  );
}

/** S02 이벤트 연결. 한 번만 불러요. */
export function initSearch() {
  if (!state.form.date) {
    const now = new Date(Date.now() + 9 * 3600 * 1000); // 한국 날짜
    state.form.date = now.toISOString().slice(0, 10);
  }
  const s02 = $('#s02');
  s02.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.startKey === 'here') { useHere(); return; }
    if (t.dataset.startKey) state.form.startKey = t.dataset.startKey;
    else if (t.dataset.category) state.form.category = t.dataset.category;
    else if (t.dataset.kind && !t.disabled) state.form.kind = t.dataset.kind;
    else if (t.dataset.edit) {
      changed();
      const target = { start: '[data-field="start"]', date: '#f-date', time: '#f-start', category: '[data-field="category"]', kind: '[data-field="kind"]' }[t.dataset.edit];
      const el = $(`#s02 ${target}`);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el.focus) el.focus({ preventScroll: true });
      return;
    } else if (t.id === 'btn-search') { onPrimary(); return; }
    else return;
    renderForm();
    showErrors({});
    changed();
  });
  for (const [id, key] of [['#f-date', 'date'], ['#f-start', 'startTime'], ['#f-end', 'endTime']]) {
    $(id).addEventListener('change', (e) => { state.form[key] = e.target.value; showErrors({}); changed(); });
  }
  renderForm();
  renderConfirm();
}

/** S02 에 들어올 때마다 (조건 바꾸기로 돌아와도 값 유지) */
export function renderSearch() {
  renderForm();
  renderConfirm();
}
