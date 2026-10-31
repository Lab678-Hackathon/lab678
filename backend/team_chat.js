/** 팀 프론트 164cd40의 공통 자동 대화 모듈. 최종 반영 전 담당 확인용이다.
 * /js/dj-chat.js로 제공하며 같은 폴더의 state/search 모듈을 사용한다.
 * 좌표/행사 사실을 만들지 않고, 입력 수정·새 발화 뒤 오래된 응답은 폐기한다.
 */
import { state, save } from './state.js';
import { renderSearch } from './search.js';
import { preferenceFields, preferenceText, renderResultPreferences } from './dj-preferences.js';
import { VoiceSession, listenForReply } from './dj-voice.js';
import { screenContext, openingQuestion, voiceAction, currentCandidate, candidateSpeech } from './dj-voice-actions.js';
import { mountInputMeter } from './dj-meter.js';

const root = document.querySelector('#s02');
const api = ['localhost', '127.0.0.1'].includes(location.hostname) ? ''
  : (document.querySelector('meta[name="lab678-api"]')?.content || '').replace(/\/$/, '');
const labels = { start_query: '출발지', start_at: '출발 시각', end_at: '종료 시각', category: '활동', request_kind: '추천 방식', stay_minutes: '체류시간',
  categories: '관심 활동', free_only: '무료만', budget_krw: '관람 예산', keywords: '관심어', exclude_terms: '제외 조건',
  walking_preference: '걷기 선호', indoor_outdoor: '실내·실외', unsupported_requirements: '필수 조건' };
state.chat ||= { revision: 0, history: [], pending: null, text: '' };
let abort = null;
let busy = false;
let voiceSession = null;
let singleRecognition = null;
let diagnosticAttempt = 0;
const diagnosticStart = performance.now();
const diagnosticLines = [];
let lastReply = '';
let voiceRoute = null;
const box = document.createElement('section');
box.id = 'dj-chat';
box.className = 'field';
box.setAttribute('aria-label', 'AI와 나들이 조건 정하기');
box.innerHTML = `<h2>AI와 대화하기</h2>
 <p id="chat-status" role="status" aria-live="polite"></p>
 <label for="chat-text">하고 싶은 말씀</label>
 <textarea id="chat-text" rows="2" maxlength="1000" placeholder="말하거나 직접 입력해 주세요"></textarea>
 <p id="chat-mic-state" hidden>자동 대화 꺼짐</p>
 <div class="chat-actions"><button type="button" class="btn btn--primary" id="chat-mic" data-phase="idle" aria-pressed="false" aria-label="자동 음성 대화 켜기" aria-describedby="chat-mic-state chat-voice-status"><span class="mic-visual" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/><path class="mic-off-slash" d="m3 3 18 18"/></svg></span><span id="chat-mic-label">자동 음성 대화 시작</span></button>
 <button type="button" class="btn btn--outline" id="chat-voice-stop" disabled hidden>대화 중지</button>
 <button type="button" class="btn btn--primary" id="chat-send">보내기</button></div>
 <p id="chat-voice-status" role="status" aria-live="polite" data-phase="idle">시작을 누르면 인사 후 대화를 시작해요.</p>
 <p id="chat-live-transcript" role="status" aria-live="polite" data-state="idle" hidden></p>
 <p id="chat-preferences"></p><div id="chat-conflicts" hidden></div>
 <details id="chat-voice-settings"><summary>음성 대화 설정</summary>
 <label>최대 대화 횟수 <input id="chat-max-turns" type="number" min="1" max="10" step="1">회</label>
 <label>무응답 자동 종료 <input id="chat-silence-seconds" type="number" min="5" max="60" step="1">초</label>
 <label><input id="chat-read-opening" type="checkbox"> 시작할 때 인사 먼저 듣기</label>
 <p class="caption muted">기본은 짧은 인사를 들은 뒤 말하기예요. 스피커를 켜 주세요. 인사 듣기를 끄면 바로 듣기를 준비해요.</p>
 <p class="caption muted">말이 없으면 3초 뒤 한 번만 질문해요. 답변 읽기 시간은 무응답 시간에 포함하지 않아요.</p>
 <div class="chat-actions"><button type="button" class="link-btn" id="chat-read">답변 읽기</button>
 <button type="button" class="link-btn" id="chat-stop">읽기 중지</button>
 <label><input id="chat-auto-read" type="checkbox"> 텍스트 대화 답변도 읽기</label></div></details>
 <details><summary>대화 기록</summary><div id="chat-history"></div></details>
 <details id="chat-diagnostics"><summary>마이크 점검·로그</summary>
 <p id="chat-device-status" class="caption"></p><p id="chat-screen" class="caption"></p>
 <button type="button" class="btn btn--outline" id="chat-listen-once" aria-pressed="false">한 번 말하기</button>
 <div id="chat-mic-meter"></div>
 <section id="chat-voice-debug"><h3>음성 이벤트·오류 로그</h3><div class="chat-actions"><button type="button" id="chat-log-copy">로그 복사</button><button type="button" id="chat-log-save">텍스트 저장</button><button type="button" id="chat-log-image">로그 이미지 저장</button><button type="button" id="chat-log-clear">로그 지우기</button></div><pre id="chat-voice-log" tabindex="0" aria-label="음성 이벤트 및 오류 로그"></pre><p id="chat-log-copy-status" role="status"></p></section></details>`;
const style = document.createElement('style');
style.textContent = '#dj-chat textarea{width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1px solid #687c71;border-radius:12px}#dj-chat .chat-actions{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}#dj-chat .btn{flex:1;min-width:120px}#dj-chat [hidden]{display:none!important}#chat-history p{white-space:pre-wrap;overflow-wrap:anywhere}#chat-conflicts{padding:16px;border:2px solid #8b632a;border-radius:12px;margin:12px 0}#chat-conflicts p{overflow-wrap:anywhere}';
document.head.append(style);
style.textContent += '#chat-voice-settings{border:1px solid #687c71;border-radius:12px;padding:12px;margin:12px 0}#chat-voice-settings summary{font-weight:700;cursor:pointer;padding:6px 0}#chat-voice-settings label{display:block;margin:12px 0}#chat-voice-settings input[type="number"]{font:inherit;width:90px;min-height:44px;padding:6px;box-sizing:border-box;margin:0 6px}#chat-voice-settings input[type="checkbox"]{width:24px;height:24px;vertical-align:middle;margin-right:8px}#chat-voice-status{white-space:pre-wrap}';
style.textContent += '#dj-chat{padding:20px;border:2px solid #547562;border-radius:16px;background:#fff;margin:16px 0}#dj-chat h2{font-size:1.35rem;margin:0 0 12px}#dj-chat p{overflow-wrap:anywhere}';
style.textContent += '#dj-chat #chat-mic{display:flex;align-items:center;justify-content:center;gap:12px;flex-basis:100%;min-height:64px;padding:16px;font-size:19px;line-height:1.5;border:2px solid #245e48;background:#fff;color:#245e48}#dj-chat #chat-mic svg{width:30px;height:30px;flex-shrink:0}#dj-chat #chat-mic[aria-pressed="true"]{background:#205d46;color:#fff;border-color:#205d46;box-shadow:0 0 0 4px #d9eee2}#chat-mic[aria-pressed="true"] .mic-off-slash{display:none}#chat-mic-state{font-size:18px;font-weight:750;padding:10px 12px;border-radius:10px;background:#edf1ee;color:#43564a}#chat-mic-state[data-active="true"]{background:#d9eee2;color:#164c36}';
style.textContent += '#chat-mic .mic-visual{position:relative;display:grid;place-items:center;width:44px;height:44px;flex-shrink:0}#chat-mic .mic-visual svg{position:relative;z-index:1}#chat-mic .mic-visual::before,#chat-mic .mic-visual::after{content:"";position:absolute;inset:0;border:2px solid currentColor;border-radius:50%;opacity:0;pointer-events:none}#chat-mic[data-phase="listening"] .mic-visual::before,#chat-mic[data-phase="listening"] .mic-visual::after{animation:lab678-mic-ripple 1.8s ease-out infinite}#chat-mic[data-phase="listening"] .mic-visual::after{animation-delay:.9s}#chat-mic-state[data-phase="listening"]{border-left:5px solid #205d46}#chat-mic-state[data-phase="starting"]{background:#fff3d9;color:#6a4b12}@keyframes lab678-mic-ripple{0%{transform:scale(.65);opacity:.75}100%{transform:scale(1.65);opacity:0}}@media(prefers-reduced-motion:reduce){#chat-mic[data-phase="listening"] .mic-visual::before,#chat-mic[data-phase="listening"] .mic-visual::after{animation:none;transform:scale(1.1);opacity:.6}#chat-mic[data-phase="listening"] .mic-visual::after{display:none}}';
style.textContent += '#chat-voice-debug{padding:14px;border:1px solid #9faeb0;border-radius:12px;margin:14px 0}#chat-voice-debug h3{font-size:19px;margin:0 0 10px}#chat-voice-log{white-space:pre-wrap;overflow-wrap:anywhere;max-height:280px;overflow:auto;font:15px/1.6 ui-monospace,monospace;background:#f0f3f4;padding:12px;border-radius:8px}';
style.textContent += '#chat-live-transcript{padding:14px;border:2px solid #79978a;border-radius:12px;background:#f2f7f4;font-size:20px;line-height:1.7;white-space:pre-wrap}#chat-live-transcript[data-state="interim"]{border-style:dashed}';
style.textContent += '#dj-chat{display:block;padding:16px}#dj-chat details{margin:4px 0}#dj-chat summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:650}#dj-chat p:empty{display:none}#chat-voice-status{font-size:16px;line-height:1.5;margin:8px 0}#chat-status{font-size:19px;line-height:1.6;margin-bottom:12px}#chat-voice-settings{padding:0 10px}#s01 .home__hero,#s01 [data-tip]{display:none}#chat-mic[data-phase="speaking"] .mic-visual svg{display:none}#chat-mic[data-phase="speaking"] .mic-visual::before{content:"🔊";border:0;opacity:1;font-size:32px;display:grid;place-items:center}#chat-mic[data-phase="thinking"] .mic-visual svg,#chat-mic[data-phase="starting"] .mic-visual svg{display:none}#chat-mic[data-phase="thinking"] .mic-visual::before,#chat-mic[data-phase="starting"] .mic-visual::before{content:"⏳";border:0;opacity:1;font-size:30px;display:grid;place-items:center}';
document.querySelector('#s01 .home__hero').after(box);
const $ = (selector) => box.querySelector(selector);
style.textContent += '.app{max-width:390px;width:100%;margin-inline:auto}#s01 .home{padding:12px 16px 88px;gap:12px}#s02 .page{padding:8px 16px 110px;gap:10px}#s02 .field{gap:6px}#s02 .field__label{font-size:18px}#s02 .input{font-size:18px;min-height:48px;padding:10px 12px}#s02 .chip{font-size:17px;min-height:44px;padding:0 12px}#s02 .bubble{font-size:18px;padding:12px}#s02 .segmented button{font-size:17px;padding:10px 8px}#s02 .bottombar{padding:12px 16px}#dj-chat{margin:0;padding:14px}#dj-chat .chat-actions{gap:8px;margin:10px 0}#dj-chat #chat-mic{padding:12px;min-height:60px}';
const inputMeter = mountInputMeter($('#chat-mic-meter'));

/** 전사 내용 없이 엔진 이벤트를 기록한다. 접힌 점검 메뉴에서도 메모리 로그를 계속 갱신한다. */
function logVoice(message) {
  diagnosticLines.push(`+${Math.round(performance.now() - diagnosticStart)}ms ${message}`);
  if (diagnosticLines.length > 200) diagnosticLines.shift();
  $('#chat-voice-log').textContent = diagnosticLines.join('\n');
  $('#chat-voice-log').scrollTop = $('#chat-voice-log').scrollHeight;
}

/** 중간 결과는 화면에서만 갱신한다. 확정 전에는 AI 전송·대화 저장·조건 변경을 하지 않는다. */
function showLiveTranscript(interim, confirmed = '') {
  const target = $('#chat-live-transcript');
  target.hidden = !interim && !confirmed;
  target.dataset.state = interim ? 'interim' : confirmed ? 'final' : 'waiting';
  target.textContent = interim ? `듣는 중(임시): ${[confirmed, interim].filter(Boolean).join(' ')}`
    : confirmed ? `인식 확정: ${confirmed}` : '말씀해 주세요. 인식되는 문장을 여기에 표시해요.';
}

/** 브라우저가 노출한 환경/입력 목록만 읽는다. 추가 녹음 권한을 요청하거나 장치 ID를 기록하지 않는다. */
function inspectVoiceEnvironment() {
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iOS/iPadOS'
    : /Win/i.test(platform + ua) ? 'Windows' : /Mac/i.test(platform + ua) ? 'macOS' : platform || '확인 불가';
  const browser = /Edg\//.test(ua) ? 'Edge 표시' : /Chrome\//.test(ua) ? 'Chrome 표시' : /Safari\//.test(ua) ? 'Safari 표시' : '브라우저 확인 필요';
  const supported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  $('#chat-device-status').textContent = `자동 확인: ${os} · ${browser} · 음성 API ${supported ? '있음' : '없음'}`;
  logVoice(`environment: ${os} · ${browser} · speech_api=${supported} · UA기반 추정, 앱내브라우저 여부 확정 불가`);
  try {
    navigator.permissions?.query?.({ name: 'microphone' })?.then(result => logVoice(`microphone permission=${result.state}`)).catch(() => logVoice('microphone permission query unavailable'));
    navigator.mediaDevices?.enumerateDevices?.()?.then(items => {
      const inputs = items.filter(item => item.kind === 'audioinput');
      logVoice(`audioinput 항목 ${inputs.length}개: ${inputs.map(item => (item.deviceId === 'default' ? '[기본] ' : '') + (item.label.slice(0, 120) || '권한 전 장치명 미공개')).join(' / ') || '노출된 장치 없음'} (장치ID 제외)`);
    }).catch(() => logVoice('audioinput 목록 조회 실패'));
  } catch { logVoice('권한/장치 조회 API 미지원'); }
}

/** 시작 방식과 브라우저 정보를 기록하고 권한 조회는 인식 시작을 기다리게 하지 않는다. */
function beginVoiceDiagnostics(mode) {
  logVoice(`--- 시도 #${++diagnosticAttempt} ${mode} · ${new Date().toISOString()} ---`);
  logVoice(`${navigator.userAgent}\n페이지 ${location.origin}${location.pathname}`);
  logVoice(`online=${navigator.onLine} secure=${window.isSecureContext} · meter capture stopped before recognition`);
  inspectVoiceEnvironment();
}
logVoice('준비 완료 · 음성 입력 테스트(1회)는 TTS/AI 없이 인식 엔진을 직접 시작합니다.');
inspectVoiceEnvironment();
$('#chat-log-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#chat-voice-log').textContent); $('#chat-log-copy-status').textContent = '로그를 복사했어요.'; }
  catch { $('#chat-log-copy-status').textContent = '로그 내용을 선택해 직접 복사해 주세요.'; }
});
$('#chat-log-clear').addEventListener('click', () => { diagnosticLines.length = 0; logVoice('로그 지움'); });
/** 현재 메모리 로그를 로컬 파일로 저장한다. 이미지에는 화면 전체나 전사/AI 본문을 넣지 않는다. */
async function saveVoiceLog(asImage) {
  try {
    const content = ['오늘 나들이 음성 진단', new Date().toISOString(), ...diagnosticLines].join('\n');
    let blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    if (asImage) {
      const rows = content.split('\n').flatMap(line => {
        const chars = Array.from(line), parts = [];
        do { parts.push(chars.splice(0, 90).join('')); } while (chars.length);
        return parts;
      });
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 48 + rows.length * 25;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#17363b'; context.font = '18px monospace';
      rows.forEach((line, index) => context.fillText(line, 24, 32 + index * 25));
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('이미지 생성 실패');
    }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `voice-log-${Date.now()}.${asImage ? 'png' : 'txt'}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#chat-log-copy-status').textContent = asImage ? '로그 이미지를 저장했어요.' : '로그 텍스트를 저장했어요.';
  } catch { $('#chat-log-copy-status').textContent = '저장하지 못했어요. 로그 복사로 보관해 주세요.'; }
}
$('#chat-log-save').addEventListener('click', () => saveVoiceLog(false));
$('#chat-log-image').addEventListener('click', () => saveVoiceLog(true));
$('#chat-text').value = state.chat.text || '';
const savedVoice = state.chat.voiceSettings || {};
$('#chat-max-turns').value = Number.isInteger(savedVoice.maxTurns) && savedVoice.maxTurns >= 1 && savedVoice.maxTurns <= 10 ? savedVoice.maxTurns : 5;
$('#chat-silence-seconds').value = Number.isInteger(savedVoice.silenceSeconds) && savedVoice.silenceSeconds >= 5 && savedVoice.silenceSeconds <= 60 ? savedVoice.silenceSeconds : 15;
$('#chat-read-opening').checked = savedVoice.readOpening !== false;

/** 현재 팀 입력을 조건 초안으로 만든다. 미선택 출발지에 기본 좌표를 채우지 않는다. */
function draft() {
  const f = state.form;
  const d = { request_kind: f.kind || 'place' };
  Object.assign(d, state.chat.preferences || {});
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

/** 대화 패널은 첫 화면에만 둔다. 기존 설정/결과 화면으로 이동하면 음성도 종료한다. */
function mountConversation() {
  const screen = screenContext();
  if (screen.kind === 'search' && state.form.cultureSource !== 'seoul') {
    state.form.cultureSource = 'seoul'; save();
  }
  const target = document.querySelector('#s01 .home');
  box.hidden = screen.kind !== 'home';
  if (box.hidden) {
    stopSingleRecognition();
    voiceSession?.stop('대화를 멈추고 설정 화면으로 이동했어요.');
    window.speechSynthesis?.cancel();
  }
  if (target && box.parentElement !== target) {
    target.querySelector('.home__hero')?.after(box);
  }
  $('#chat-screen').textContent = `현재 화면 · ${screen.name}`;
  const manual = document.querySelector('#chat-manual-entry, #s01 button[data-go="/search"]');
  if (manual) {
    manual.id = 'chat-manual-entry'; manual.removeAttribute('data-go'); manual.textContent = '직접 설정하기';
    manual.onclick = () => openOriginalMenu(draft(), $('#chat-text').value);
  }
}

/** 초안을 보존하고 기존 S02 설정 화면으로 이동한다. 개발 점검 화면으로 보내지 않는다. */
function openOriginalMenu(need, message) {
  stopSingleRecognition();
  voiceSession?.stop('원하는 활동을 확인했어요. 나들이 설정으로 이동해요.');
  window.speechSynthesis?.cancel();
  state.form.cultureSource = 'seoul';
  save();
  void navigateVoice('/search');
}

/** 음성이 요청한 알려진 화면으로 이동할 때만 대화를 이어간다. 수동 이동은 중지한다. */
async function navigateVoice(path) {
  if (location.hash === '#' + path) return;
  voiceRoute = '#' + path;
  await new Promise(resolve => {
    window.addEventListener('hashchange', resolve, { once: true });
    location.hash = path;
  });
}

/** 현재 후보와 라우터로 화면을 조작한다. 미연결 기능을 완료한 것처럼 안내하지 않는다. */
async function handleAction(action) {
  if (action.kind === 'stop') return { assistant_text: '음성 대화를 마칠게요.', end_session: true };
  if (action.kind === 'navigate') { await navigateVoice(action.path); return { assistant_text: action.text }; }
  if (action.kind === 'back') {
    const detail = screenContext().kind === 'detail';
    await navigateVoice(detail ? '/results' : '/search');
    return { assistant_text: detail ? '추천 목록으로 돌아왔어요. 몇 번째 장소를 볼까요?' : '조건 입력 화면으로 돌아왔어요. 무엇을 바꿀까요?' };
  }
  if (action.kind === 'results') {
    if (!state.result) return { assistant_text: '아직 추천 결과가 없어요. 먼저 나들이 조건을 말씀해 주세요.' };
    await navigateVoice('/results');
    return { assistant_text: `추천 결과 ${state.result.candidates.length}곳이에요. 몇 번째 장소를 볼까요?` };
  }
  if (action.kind === 'decision') {
    if (!state.chat.pending) return { assistant_text: '변경 동의를 기다리는 조건은 없어요. 바꾸고 싶은 내용을 말씀해 주세요.' };
    await navigateVoice('/search'); decide(action.accept);
    return { assistant_text: $('#chat-status').textContent, ready_to_search: false };
  }
  if (action.kind === 'detail') {
    const id = state.shownIds?.[action.index];
    const candidate = state.result?.candidates?.find(item => item.id === id);
    if (!candidate) return { assistant_text: '그 번호의 추천 장소가 없어요. 추천 목록에 있는 번호를 말씀해 주세요.' };
    await navigateVoice('/place/' + encodeURIComponent(candidate.id));
    return { assistant_text: `${action.index + 1}번째, ${candidate.title} 상세를 열었어요. 장소 정보를 읽거나 조건을 바꿀 수 있어요.` };
  }
  if (action.kind === 'read' || action.kind === 'select') {
    const candidate = currentCandidate();
    if (!candidate) return { assistant_text: '먼저 추천 장소의 상세 화면을 열어 주세요.' };
    if (action.kind === 'read') return { assistant_text: candidateSpeech(candidate) };
    document.querySelector('#s04-pick').click();
    return { assistant_text: `${candidate.title}을 선택했어요. 예약이나 저장이 완료된 것은 아니에요.` };
  }
  return { assistant_text: '코스와 길찾기는 이 팀 화면에 아직 연결 중이에요. 장소 추천과 상세 보기를 먼저 이용해 주세요.' };
}

/** 현재 안내와 추천 잠금을 갱신한다. 미해결 충돌/AI 처리 중 추천은 진행하지 않는다. */
function note(text) {
  $('#chat-status').textContent = text;
  $('#chat-preferences').textContent = preferenceText(state.chat.preferences || {});
  $('#chat-send').disabled = busy || Boolean(voiceSession?.active) || Boolean(singleRecognition);
  $('#chat-mic').disabled = false;
  document.querySelector('#btn-search').disabled = busy || Boolean(voiceSession?.active) || Boolean(singleRecognition) || Boolean(state.chat.pending)
    || Boolean(state.chat.preferences?.music_followup) || Boolean(state.chat.preferences?.unsupported_requirements?.length);
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
  state.chat.preferences = Object.fromEntries(preferenceFields.filter(key => d[key] !== undefined).map(key => [key, structuredClone(d[key])]));
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
    p.textContent = `${labels[change.field] || change.field}: ${conditionLabel(change.before)} → ${conditionLabel(change.related?.categories || change.after)}`;
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

/** 변경 조건을 좌표/JSON 대신 읽을 수 있는 이름으로 표시한다. */
function conditionLabel(value) {
  if (Array.isArray(value)) return value.join(', ') || '없음';
  if (value && typeof value === 'object') return value.label || '선택한 장소';
  if (typeof value === 'boolean') return value ? '적용' : '해제';
  return ({ any: '제한 없음', short: '적게 걷기', indoor: '실내', outdoor: '실외', place: '행사 찾기', course: '문화코스' })[value] || String(value ?? '미설정');
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
      Object.assign(updated, change.related || {});
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
function invalidate(keepVoice = false, keepPending = false) {
  if (!keepVoice) { stopSingleRecognition(); voiceSession?.stop(); }
  state.chat.revision++;
  abort?.abort();
  abort = null;
  const interrupted = busy || Boolean(state.chat.pending);
  busy = false;
  if (!keepPending) state.chat.pending = null;
  fingerprint = JSON.stringify(draft());
  save(); showConflicts();
  if (interrupted) note(keepPending && state.chat.pending ? '변경할 조건을 확인해 주세요.' : '직접 바꾼 조건을 유지했어요. 이전 AI 응답은 적용하지 않습니다.');
}

/** 텍스트/최종 음성 전사를 API로 한 번 전송한다. 응답 적용 직전 revision·현재값을 다시 비교한다. */
async function send(voiceSignal = null) {
  const message = $('#chat-text').value.trim();
  if (!message) { note('하고 싶은 말씀을 입력해 주세요.'); return; }
  const action = voiceAction(message);
  invalidate(Boolean(voiceSignal), action?.kind === 'decision');
  if (voiceSignal?.aborted) return;
  if (action) {
    remember('user', message);
    const result = await handleAction(action);
    if (voiceSignal?.aborted) return;
    lastReply = result.assistant_text; remember('assistant', lastReply); note(lastReply);
    if (!voiceSignal && $('#chat-auto-read').checked) speak();
    return result;
  }
  if (screenContext().kind !== 'home') await navigateVoice('/search');
  if (voiceSignal?.aborted) return;
  const mine = ++state.chat.revision;
  const current = draft();
  const before = JSON.stringify(current);
  const history = state.chat.history.slice(-6).map(item => ({ role: item.role, content: item.content.slice(0, 1000) }));
  remember('user', message);
  state.chat.text = message;
  busy = true; abort = new AbortController();
  const controller = abort;
  const cancelVoiceRequest = () => controller.abort();
  voiceSignal?.addEventListener('abort', cancelVoiceRequest, { once: true });
  note('말씀하신 조건을 확인하고 있어요…');
  try {
    const payload = { message, revision: mine, condition_draft: current,
      confirmed_fields: Object.keys(state.chat.confirmedDraft || {}).filter(k => !['start_query', 'date'].includes(k)
        && JSON.stringify(current[k]) === JSON.stringify(state.chat.confirmedDraft[k])), conversation_context: history };
    while (new TextEncoder().encode(JSON.stringify(payload)).length > 8192 && history.length) history.shift();
    const response = await fetch(`${api}/preview/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: controller.signal, body: JSON.stringify(payload) });
    logVoice(`chat HTTP=${response.status} · revision=${mine}`);
    const result = await response.json();
    if (mine !== state.chat.revision || voiceSignal?.aborted) return;
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
    const need = result.updated_condition_draft;
    const hasNeed = !need.music_followup && !result.conflicts?.length && !need.unsupported_requirements?.length
      && (need.categories?.some(value => value !== '전체') || (need.category && need.category !== '전체') || need.keywords?.length);
    if (screenContext().kind === 'home' && hasNeed) {
      openOriginalMenu(need, message);
    }
    if (!voiceSignal && $('#chat-auto-read').checked) speak();
    return result;
  } catch (error) {
    if (mine === state.chat.revision && error.name !== 'AbortError') {
      const message = error instanceof SyntaxError ? '응답을 읽지 못했어요. 입력을 유지했으니 다시 시도해 주세요.' : error.message;
      note(message); remember('assistant', message);
    }
  } finally {
    voiceSignal?.removeEventListener('abort', cancelVoiceRequest);
    if (mine === state.chat.revision) {
      busy = false; abort = null;
      note($('#chat-status').textContent); save();
    }
  }
}

/** 횟수/무응답과 시작 안내 선택을 세션에 저장한다. 예전 설정은 기존처럼 첫 안내를 읽는다. */
function voiceSettings() {
  const maxTurns = Number($('#chat-max-turns').value);
  const silenceSeconds = Number($('#chat-silence-seconds').value);
  if (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 10 || !Number.isInteger(silenceSeconds) || silenceSeconds < 5 || silenceSeconds > 60) {
    $('#chat-voice-status').textContent = '대화 횟수는 1~10회, 무응답 시간은 5~60초로 설정해 주세요.';
    return null;
  }
  state.chat.voiceSettings = { maxTurns, silenceSeconds, readOpening: $('#chat-read-opening').checked }; save();
  return state.chat.voiceSettings;
}
/** 자동/단발 인식 상태를 표시하고 독립 미터의 동시 마이크 캡처를 막는다. */
function renderVoiceState({ active, phase, turns, limit, message }, mode = 'auto') {
    if (!active && $('#chat-live-transcript').dataset.state === 'interim') {
      $('#chat-live-transcript').dataset.state = 'cancelled';
      $('#chat-live-transcript').textContent = '확정되지 않은 입력은 자동 전송하지 않았어요.';
    }
    inputMeter.stop(active ? '인식 중에는 입력 미터를 따로 열지 않아요.' : '입력 미터 꺼짐');
    $('#chat-mic-meter .meter-test').disabled = active;
    const phaseLabels = { speaking: 'AI가 말하는 중', listening: '듣는 중', starting: '마이크 연결 중', thinking: '답변 생각하는 중' };
    $('#chat-mic-label').textContent = active ? `${phaseLabels[phase] || '대화 중'} · 중지` : '자동 음성 대화 시작';
    $('#chat-mic .mic-visual').setAttribute('data-state', active ? phase : 'idle');
    $('#chat-mic').setAttribute('aria-pressed', String(active));
    $('#chat-mic').dataset.phase = phase;
    $('#chat-mic').setAttribute('aria-label', active ? (mode === 'once' ? '음성 입력 테스트 중지' : '자동 음성 대화 끄기') : '자동 음성 대화 켜기');
    const phases = { starting: '마이크 연결 중', listening: '듣는 중 · 지금 말씀해 주세요', thinking: '답변 확인 중', speaking: 'AI 질문·답변 읽는 중' };
    $('#chat-mic-state').dataset.active = String(active);
    $('#chat-mic-state').dataset.phase = phase;
    $('#chat-mic-state').textContent = active ? `${mode === 'once' ? '음성 입력 테스트 중' : '자동 대화 켜짐'} · ${phases[phase] || '준비 중'}` : '자동 대화 꺼짐';
    $('#chat-voice-stop').disabled = !active;
    $('#chat-voice-stop').hidden = !active;
    $('#chat-listen-once').textContent = mode === 'once' && active ? '음성 입력 중지' : '한 번 말하기';
    $('#chat-listen-once').setAttribute('aria-pressed', String(mode === 'once' && active));
    $('#chat-max-turns').disabled = $('#chat-silence-seconds').disabled = active;
    $('#chat-voice-status').dataset.phase = phase;
    $('#chat-voice-status').textContent = `${turns}/${limit}회 · ${message}`;
    note($('#chat-status').textContent);
}

/** 단발 인식 중지 시 늦은 결과로 입력/상태가 바뀌지 않도록 세션부터 무효화한다. */
function stopSingleRecognition() {
  if (!singleRecognition) return;
  const controller = singleRecognition; singleRecognition = null; controller.abort();
  renderVoiceState({ active: false, phase: 'idle', turns: 0, limit: 1, message: '음성 입력 테스트를 멈췄어요.' }, 'once');
}

/** 사용자 클릭에서 TTS·AI·getUserMedia 없이 start()를 직접 호출하는 진단 입력이다. */
async function singleInput() {
  if (singleRecognition) { stopSingleRecognition(); return; }
  invalidate(false, true); window.speechSynthesis?.cancel(); inputMeter.dispose();
  beginVoiceDiagnostics('single direct start');
  showLiveTranscript('', '');
  const controller = new AbortController(); singleRecognition = controller;
  renderVoiceState({ active: true, phase: 'starting', turns: 0, limit: 1, message: '한 문장을 말씀해 주세요. 이 테스트는 AI에 자동 전송하지 않아요.' }, 'once');
  let message = '';
  try {
    const text = await listenForReply(controller.signal, voiceSettings()?.silenceSeconds || 15, value => {
      if (singleRecognition !== controller) return;
      $('#chat-text').value = value; state.chat.text = value; save(); showLiveTranscript('', value);
    }, listening => {
      if (singleRecognition === controller && !controller.signal.aborted) renderVoiceState({ active: true, phase: listening ? 'listening' : 'starting', turns: 0, limit: 1, message: listening ? '듣고 있어요. 한 문장을 말씀해 주세요.' : '음성 인식 응답을 기다려요.' }, 'once');
    }, { log: logVoice, retryEmpty: false, interimResults: false });
    message = `음성 입력 ${text.length}글자를 받았어요. 문장을 확인하고 보내기를 누르면 AI와 대화합니다.`;
  } catch (error) { message = error.name === 'AbortError' ? '음성 입력 테스트를 멈췄어요.' : error.message; logVoice(`single input: ${error.name} · ${error.message}`); }
  finally {
    if (singleRecognition === controller) { singleRecognition = null; renderVoiceState({ active: false, phase: 'idle', turns: 1, limit: 1, message }, 'once'); }
  }
}

voiceSession = new VoiceSession({
  submit: async (text, signal) => { $('#chat-text').value = text; return send(signal); },
  onTranscript: text => { $('#chat-text').value = text; state.chat.text = text; save(); showLiveTranscript('', text); },
  onState: renderVoiceState,
  onLog: logVoice,
  onInterim: showLiveTranscript,
});
$('#chat-max-turns').addEventListener('change', voiceSettings);
$('#chat-silence-seconds').addEventListener('change', voiceSettings);
$('#chat-read-opening').addEventListener('change', voiceSettings);
$('#chat-send').addEventListener('click', () => send());
$('#chat-mic').addEventListener('click', () => {
  if (singleRecognition) { stopSingleRecognition(); return; }
  if (voiceSession.active) { voiceSession.stop(); return; }
  const settings = voiceSettings();
  if (!settings) return;
  invalidate(false, true); window.speechSynthesis?.cancel();
  inputMeter.dispose(); beginVoiceDiagnostics('automatic conversation');
  lastReply = openingQuestion(); remember('assistant', lastReply); note(lastReply);
  logVoice(`opening=${settings.readOpening ? 'read_before_listening' : 'screen_only_immediate_listening'}`);
  voiceSession.start({ ...settings, initialPrompt: settings.readOpening ? lastReply : '' });
});
$('#chat-voice-stop').addEventListener('click', () => { stopSingleRecognition(); voiceSession.stop(); });
$('#chat-listen-once').addEventListener('click', singleInput);
$('#chat-read').addEventListener('click', () => { voiceSession.stop(); speak(); });
$('#chat-stop').addEventListener('click', () => { voiceSession.stop(); window.speechSynthesis?.cancel(); });
$('#chat-text').addEventListener('input', () => {
  invalidate(false, true);
  state.chat.text = $('#chat-text').value; save();
});
for (const type of ['input', 'change', 'click']) root.addEventListener(type, event => {
  if (box.contains(event.target)) return;
  const manualCategory = event.target.closest('[data-category]')?.dataset.category;
  queueMicrotask(() => {
    if (manualCategory) {
      state.chat.preferences ||= {};
      state.chat.preferences.categories = [manualCategory]; state.chat.preferences.music_followup = false;
    }
    if (fingerprint !== JSON.stringify(draft())) { state.chat.confirmedDraft = null; invalidate(); note('바꾼 조건을 반영했어요.'); }
  });
});
root.addEventListener('click', event => {
  if (event.target.closest('#btn-search') && (busy || voiceSession.active || state.chat.pending)) {
    event.preventDefault(); event.stopImmediatePropagation();
    note('대화 처리가 끝난 뒤 변경할 조건을 확인해 주세요.');
  }
}, true);
window.addEventListener('hashchange', () => {
  if (voiceRoute === location.hash) voiceRoute = null;
  else { invalidate(false, true); window.speechSynthesis?.cancel(); }
  mountConversation();
  queueMicrotask(renderResultPreferences);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) invalidate(false, true); });
window.addEventListener('pagehide', () => invalidate(false, true));
renderResultPreferences();
mountConversation();
showHistory(); showConflicts(); note(state.chat.pending ? '이전 변경 요청을 확인해 주세요.' : '조건을 말씀해 주세요.');
