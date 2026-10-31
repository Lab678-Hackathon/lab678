/** 공통 음성 조작. 앱에 이미 있는 화면과 현재 후보 ID만 사용하며 URL/행사 사실을 만들지 않는다. */
import { state, candidateById } from './state.js';

/** 현재 화면을 안전하게 구분한다. 알 수 없는 주소를 실행 대상으로 사용하지 않는다. */
export function screenContext() {
  const path = location.hash.slice(1) || '/';
  if (path.startsWith('/place/')) return { name: '장소 상세', path, kind: 'detail' };
  return { path, ...({ '/home': { name: '홈', kind: 'home' }, '/search': { name: '나들이 조건', kind: 'search' },
    '/results': { name: '추천 결과', kind: 'results' }, '/me': { name: '내 정보', kind: 'me' } }[path] || { name: '시작', kind: 'landing' }) };
}

/** 시작에는 짧은 인사만 읽는다. 무응답 후속 질문은 음성 세션이 한 번만 처리한다. */
export function openingQuestion() {
  return '안녕하세요.';
}

/** 번호 발화를 현재 추천 순서로만 변환한다. 화면에 없는 후보를 생성하지 않는다. */
function candidateIndex(text) {
  const match = text.match(/(?:^|\s)(\d{1,2}|첫번째|첫째|첫|두번째|둘째|두|세번째|셋째|세|네번째|넷째|네|다섯)\s*(?:번(?:째)?|째)?\s*(?:장소|행사|곳)?(?=\s|$)/);
  if (!match) return null;
  const index = ({ 첫: 1, 첫째: 1, 첫번째: 1, 두: 2, 둘째: 2, 두번째: 2, 세: 3, 셋째: 3, 세번째: 3, 네: 4, 넷째: 4, 네번째: 4, 다섯: 5 })[match[1]] || Number(match[1]);
  return Number.isInteger(index) && index > 0 ? index - 1 : null;
}

/** 단순 조작을 유한 명령으로 해석한다. 취향·일정 등 나머지 자연어는 기존 AI 조건 API로 보낸다. */
export function voiceAction(message) {
  const text = message.trim().replace(/[.!?。！？]+$/g, '').trim();
  if (/^(?:그만|그만해|그만할래|대화\s*(?:중지|종료)|음성\s*(?:중지|종료)|멈춰)(?:요|줘)?$/.test(text)) return { kind: 'stop' };
  if (/^(?:변경\s*(?:모두\s*)?반영|바꿔\s*주세요|변경에\s*동의)(?:해\s*줘)?$/.test(text)) return { kind: 'decision', accept: true };
  if (/^(?:기존\s*조건\s*유지|변경\s*취소|바꾸지\s*마)(?:해\s*줘)?$/.test(text)) return { kind: 'decision', accept: false };
  if (/^(?:홈|처음)(?:\s*(?:화면)?(?:으로)?\s*(?:가|가줘|이동|돌아가|돌아가줘|보여줘))?$/.test(text)) return { kind: 'navigate', path: '/home', text: '홈으로 이동했어요. 어떤 나들이를 하고 싶으세요?' };
  if (/^(?:추천\s*(?:결과|목록)|목록)(?:\s*(?:으로)?\s*(?:가|가줘|이동|돌아가|돌아가줘|보여줘))?$/.test(text)) return { kind: 'results' };
  if (/^(?:내\s*정보)(?:\s*(?:로)?\s*(?:가|가줘|이동|보여줘))?$/.test(text)) return { kind: 'navigate', path: '/me', text: '내 정보 화면으로 이동했어요. 조건을 바꾸고 싶으면 말씀해 주세요.' };
  if (/^(?:뒤로|돌아가)(?:\s*가|줘)?$/.test(text)) return { kind: 'back' };
  if (/^(?:조건\s*(?:바꾸기|바꿀래|바꿔|수정)|나들이\s*찾기|대화로\s*찾기)(?:\s*줘|요)?$/.test(text)) return { kind: 'navigate', path: '/search', text: '기존 조건을 유지해서 입력 화면으로 돌아왔어요. 무엇을 바꿀까요?' };
  if (/^(?:이\s*장소\s*선택|여기로\s*할래|여기\s*선택)(?:해\s*줘|요)?$/.test(text)) return { kind: 'select' };
  if (/^(?:이\s*장소|상세|장소\s*정보)(?:를)?\s*읽어(?:\s*줘|주세요)?$/.test(text)) return { kind: 'read' };
  if (/(?:코스|길찾기|경로\s*안내)/.test(text) && /(?:보여|화면|열어|이동)/.test(text)) return { kind: 'unavailable' };
  if (/(?:보여|자세히|상세|열어)/.test(text)) {
    const index = candidateIndex(text);
    if (index !== null) return { kind: 'detail', index };
  }
  return null;
}

/** 서버가 반환한 현재 상세 후보만 찾는다. 저장소에 없는 ID는 읽거나 선택하지 않는다. */
export function currentCandidate() {
  const screen = screenContext();
  if (screen.kind !== 'detail') return null;
  try { return candidateById(decodeURIComponent(screen.path.slice('/place/'.length))); }
  catch { return null; }
}

/** 사실 필드 그대로 낭독한다. 미확인 운영·가격·예약은 확정적으로 설명하지 않는다. */
export function candidateSpeech(candidate) {
  return `${candidate.title}. ${candidate.venue || '장소 이름 확인 필요'}. 운영시간 ${candidate.opening_info || '확인 필요'}. 가격 ${candidate.price_info || '확인 필요'}. ${(candidate.checks_required || []).join('. ')}. 예약 가능 여부는 공식 안내에서 확인해 주세요.`;
}
