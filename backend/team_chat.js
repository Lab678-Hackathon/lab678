/** 팀 프론트 164cd40의 S02에 붙이는 독립 채팅 모듈. 최종 반영 전 담당 확인용이다.
 * /js/dj-chat.js로 제공하며 같은 폴더의 state/search 모듈을 사용한다.
 * 좌표/행사 사실을 만들지 않고, 입력 수정·새 발화 뒤 오래된 응답은 폐기한다.
 */
import { state, save } from './state.js';
import { renderSearch } from './search.js';

const root = document.querySelector('#s02');
const api = (document.querySelector('meta[name="lab678-api"]')?.content || '').replace(/\/$/, '');
const labels = { start_query: '출발지', start_at: '출발 시각', end_at: '종료 시각', category: '활동', request_kind: '추천 방식', stay_minutes: '체류시간' };
state.chat ||= { revision: 0, history: [], pending: null, text: '' };
let abort = null;
let busy = false;
let recognition = null;
let listening = false;
let voiceGeneration = 0;
let lastReply = '';
const box = document.createElement('section');
box.id = 'dj-chat';
box.className = 'field';
box.setAttribute('aria-label', 'AI와 나들이 조건 정하기');
box.innerHTML = `<h2>더 원하는 게 있으세요?</h2>
 <p class="muted">출발지·날짜·시간·보고 싶은 활동을 말하거나 적어 주세요.</p>
 <label for="chat-text">하고 싶은 말씀</label>
 <textarea id="chat-text" rows="3" maxlength="1000" placeholder="국악을 듣고 싶어요"></textarea>
 <div class="chat-actions"><button type="button" class="btn btn--outline" id="chat-mic">한 번 말하기</button>
 <button type="button" class="btn btn--primary" id="chat-send">보내기</button></div>
 <p id="chat-status" role="status" aria-live="polite"></p>
 <div id="chat-conflicts" hidden></div><details><summary>대화 기록</summary><div id="chat-history"></div></details>
 <div class="chat-actions"><button type="button" class="link-btn" id="chat-read">답변 읽기</button>
 <button type="button" class="link-btn" id="chat-stop">읽기 중지</button>
 <label><input id="chat-auto-read" type="checkbox"> 답변 자동 읽기</label></div>`;
const style = document.createElement('style');
style.textContent = '#dj-chat textarea{width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1px solid #687c71;border-radius:12px}#dj-chat .chat-actions{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}#dj-chat .btn{flex:1;min-width:120px}#dj-chat [hidden]{display:none!important}#chat-history p{white-space:pre-wrap;overflow-wrap:anywhere}#chat-conflicts{padding:16px;border:2px solid #8b632a;border-radius:12px;margin:12px 0}#chat-conflicts p{overflow-wrap:anywhere}';
document.head.append(style);
document.querySelector('#confirm').before(box);
const $ = (selector) => box.querySelector(selector);
$('#chat-text').value = state.chat.text || '';

/** 현재 팀 입력을 조건 초안으로 만든다. 미선택 출발지에 기본 좌표를 채우지 않는다. */
function draft() {
  const f = state.form;
  const d = { request_kind: f.kind || 'place' };
  if (f.date) d.date = f.date;
  if (f.category) d.category = f.category;
  if (f.date && f.startTime) d.start_at = `${f.date}T${f.startTime}:00+09:00`;
  if (f.date && f.endTime) d.end_at = `${f.date}T${f.endTime}:00+09:00`;
  if (f.placeQuery) d.start_query = f.placeQuery;
  if (f.startKey === 'search' && f.picked) d.start_location = { ...f.picked };
  if (f.startKey === 'here' && f.here) d.start_location = { label: '현재 위치', ...f.here };
  const qa = new URLSearchParams(location.search);
  if (f.startKey === 'qa' && (qa.has('debug') || qa.get('mode') === 'recorded'))
    d.start_location = { label: '청량리역', lat: 37.5805961, lng: 127.0482573 };
  return d;
}
let fingerprint = JSON.stringify(draft());

/** 현재 안내와 추천 잠금을 갱신한다. 미해결 충돌/AI 처리 중 추천은 진행하지 않는다. */
function note(text) {
  $('#chat-status').textContent = text;
  $('#chat-send').disabled = busy;
  document.querySelector('#btn-search').disabled = busy || Boolean(state.chat.pending);
}

/** 평문 대화 기록을 세션에 최대12개 보관한다. HTML로 해석하지 않는다. */
function remember(role, content) {
  state.chat.history.push({ role, content });
  state.chat.history = state.chat.history.slice(-12);
  save();
  showHistory();
}

/** 보관한 대화를 평문 노드로 렌더한다. */
function showHistory() {
  $('#chat-history').replaceChildren(...state.chat.history.map(item => {
    const p = document.createElement('p');
    p.textContent = `${item.role === 'user' ? '나' : '안내'}: ${item.content}`;
    return p;
  }));
}

/** 선택적으로 마지막 응답을 한국어로 읽는다. 사용자가 중지할 수 있다. */
function speak() {
  if (!lastReply || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(lastReply);
  speech.lang = 'ko-KR';
  speech.onerror = () => note('답변을 소리로 읽지 못했어요. 화면의 안내를 확인해 주세요.');
  speechSynthesis.speak(speech);
}

/** 현재 화면에 새 초안을 반영한다. 팀 UI 미연결 코스/다른 날짜 구간은 조용히 바꾸지 않는다. */
function applyDraft(d) {
  if (d.request_kind && d.request_kind !== 'place') {
    note('두 곳 코스는 이 팀 화면에 아직 연결 중이에요. 현재 입력은 유지했습니다.');
    return false;
  }
  if (d.start_at && d.end_at && d.start_at.slice(0, 10) !== d.end_at.slice(0, 10)) {
    note('이 화면에서는 같은 날의 출발·종료 시각을 입력해 주세요. 현재 입력은 유지했습니다.');
    return false;
  }
  const f = state.form;
  if (d.start_query !== undefined) f.placeQuery = d.start_query;
  if (!d.start_location && d.start_query !== undefined) { f.startKey = ''; f.picked = null; f.here = null; }
  if (d.start_at) { f.date = d.start_at.slice(0, 10); f.startTime = d.start_at.slice(11, 16); }
  if (d.end_at) { f.date = d.end_at.slice(0, 10); f.endTime = d.end_at.slice(11, 16); }
  if (d.category) f.category = d.category;
  if (d.request_kind) f.kind = d.request_kind;
  state.confirmed = null;
  save();
  renderSearch();
  fingerprint = JSON.stringify(draft());
  return true;
}

/** 충돌하는 모든 조건을 표시하고 전체 동의/거절 버튼을 만든다. */
function showConflicts() {
  const panel = $('#chat-conflicts');
  panel.replaceChildren();
  panel.hidden = !state.chat.pending;
  if (!state.chat.pending) return;
  for (const change of state.chat.pending.conflicts) {
    const p = document.createElement('p');
    const before = typeof change.before === 'object' ? change.before?.label : change.before;
    p.textContent = `${labels[change.field] || change.field}: ${before} → ${change.after}`;
    panel.append(p);
  }
  for (const [accept, text] of [[true, '변경 모두 반영'], [false, '기존 조건 유지']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn--outline'; button.textContent = text;
    button.dataset.chatDecision = String(accept);
    button.addEventListener('click', () => decide(accept));
    panel.append(button);
  }
}

/** 명시적 동의만 새 조건에 반영한다. 선택 뒤 최종 S02a 확인은 다시 거친다. */
function decide(accept) {
  const pending = state.chat.pending;
  if (!pending) return;
  if (pending.fingerprint !== JSON.stringify(draft())) { invalidate(); return; }
  if (accept) {
    const updated = draft();
    for (const change of pending.conflicts) {
      updated[change.field] = change.after;
      if (change.field === 'start_query') delete updated.start_location;
    }
    if (!applyDraft(updated)) return;
  }
  state.chat.pending = null;
  state.chat.revision++;
  save(); showConflicts();
  note(accept ? '변경을 반영했어요. 입력 조건을 확인해 주세요.' : '기존 조건을 유지했어요.');
  if (accept) searchOrigin();
}

/** 새 출발지 검색 결과를 보여주되 사용자의 장소 선택을 기다린다. */
function searchOrigin() {
  const d = draft();
  if (d.start_query && !d.start_location) document.querySelector('#btn-place')?.click();
}

/** 직접 수정·화면 이동 시 이전 요청/충돌을 무효화한다. */
function invalidate() {
  if (listening) { ++voiceGeneration; recognition?.abort(); listening = false; $('#chat-mic').textContent = '한 번 말하기'; }
  state.chat.revision++;
  abort?.abort();
  abort = null;
  const interrupted = busy || Boolean(state.chat.pending);
  busy = false;
  state.chat.pending = null;
  fingerprint = JSON.stringify(draft());
  save(); showConflicts();
  if (interrupted) note('직접 바꾼 조건을 유지했어요. 이전 AI 응답은 적용하지 않습니다.');
}

/** 텍스트/최종 음성 전사를 API로 한 번 전송한다. 응답 적용 직전 revision·현재값을 다시 비교한다. */
async function send() {
  const message = $('#chat-text').value.trim();
  if (!message) { note('하고 싶은 말씀을 입력해 주세요.'); return; }
  invalidate();
  const mine = ++state.chat.revision;
  const current = draft();
  const before = JSON.stringify(current);
  const history = state.chat.history.slice(-6).map(item => ({ role: item.role, content: item.content.slice(0, 1000) }));
  remember('user', message);
  state.chat.text = message;
  busy = true; abort = new AbortController();
  const controller = abort;
  note('말씀하신 조건을 확인하고 있어요…');
  try {
    const payload = { message, revision: mine, condition_draft: current,
      confirmed_fields: Object.keys(current).filter(k => !['start_query', 'date'].includes(k)), conversation_context: history };
    while (new TextEncoder().encode(JSON.stringify(payload)).length > 8192 && history.length) history.shift();
    const response = await fetch(`${api}/preview/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: controller.signal, body: JSON.stringify(payload) });
    const result = await response.json();
    if (mine !== state.chat.revision) return;
    if (before !== JSON.stringify(draft())) { invalidate(); note('직접 바꾼 조건을 유지했어요. 이전 AI 응답은 적용하지 않습니다.'); return; }
    if (!response.ok) throw new Error(result.message || 'AI 응답을 받지 못했어요. 다시 시도해 주세요.');
    if (result.base_revision !== mine || !result.updated_condition_draft) throw new Error('응답 조건을 확인하지 못했어요. 다시 시도해 주세요.');
    if (!applyDraft(result.updated_condition_draft)) return;
    state.chat.pending = result.conflicts?.length ? { conflicts: result.conflicts, fingerprint: JSON.stringify(draft()) } : null;
    lastReply = result.assistant_text;
    remember('assistant', lastReply);
    showConflicts();
    busy = false;
    note(lastReply);
    for (const error of result.field_errors || []) {
      const key = error.field.startsWith('start_location') ? 'start' : ['start_at', 'end_at'].includes(error.field) ? 'time' : error.field;
      const el = document.querySelector(`#err-${key}`);
      if (el) { el.textContent = error.message; el.hidden = false; }
    }
    searchOrigin();
    if ($('#chat-auto-read').checked) speak();
  } catch (error) {
    if (mine === state.chat.revision && error.name !== 'AbortError') {
      const message = error instanceof SyntaxError ? '응답을 읽지 못했어요. 입력을 유지했으니 다시 시도해 주세요.' : error.message;
      note(message); remember('assistant', message);
    }
  } finally {
    if (mine === state.chat.revision) {
      busy = false; abort = null;
      note($('#chat-status').textContent); save();
    }
  }
}

/** 브라우저 음성 인식 종료 후 최종 전사를 한 번 자동 전송한다. 실패하면 텍스트 입력을 유지한다. */
function startVoice() {
  if (listening) { recognition?.stop(); return; }
  const Engine = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Engine) { note('이 브라우저는 음성 인식을 지원하지 않아요. Chrome 또는 텍스트 입력을 사용해 주세요.'); return; }
  window.speechSynthesis?.cancel();
  invalidate();
  const generation = ++voiceGeneration;
  let text = '', failed = false;
  recognition = new Engine(); recognition.lang = 'ko-KR'; recognition.interimResults = false; recognition.continuous = false;
  recognition.onresult = event => {
    if (generation !== voiceGeneration) return;
    text = Array.from(event.results).filter(item => item.isFinal).map(item => item[0].transcript).join(' ').slice(0, 1000);
    $('#chat-text').value = text; state.chat.text = text; save();
  };
  recognition.onerror = event => { failed = true; if (generation === voiceGeneration) note(`음성 인식을 완료하지 못했어요 (${event.error}). 입력 칸에서 고치거나 다시 말해 주세요.`); };
  recognition.onend = () => {
    if (generation !== voiceGeneration) return;
    listening = false; $('#chat-mic').textContent = '한 번 말하기';
    if (text && !failed) send();
    else if (!failed) note('들은 말이 없어요. 다시 말하거나 입력해 주세요.');
  };
  try { recognition.start(); listening = true; $('#chat-mic').textContent = '말하기 마치기'; note('듣고 있어요…'); }
  catch { listening = false; note('음성 인식을 시작하지 못했어요. 텍스트로 입력해 주세요.'); }
}

$('#chat-send').addEventListener('click', send);
$('#chat-mic').addEventListener('click', startVoice);
$('#chat-read').addEventListener('click', speak);
$('#chat-stop').addEventListener('click', () => window.speechSynthesis?.cancel());
$('#chat-text').addEventListener('input', () => {
  if (listening) invalidate();
  state.chat.text = $('#chat-text').value; save();
});
for (const type of ['input', 'change', 'click']) root.addEventListener(type, event => {
  if (box.contains(event.target)) return;
  queueMicrotask(() => { if (fingerprint !== JSON.stringify(draft())) invalidate(); });
}, true);
root.addEventListener('click', event => {
  if (event.target.closest('#btn-search') && (busy || state.chat.pending)) {
    event.preventDefault(); event.stopImmediatePropagation();
    note('대화 처리가 끝난 뒤 변경할 조건을 확인해 주세요.');
  }
}, true);
window.addEventListener('hashchange', () => {
  if (location.hash !== '#/search') { invalidate(); ++voiceGeneration; recognition?.abort(); listening = false; window.speechSynthesis?.cancel(); }
});
showHistory(); showConflicts(); note(state.chat.pending ? '이전 변경 요청을 확인해 주세요.' : '조건을 말씀해 주세요.');
