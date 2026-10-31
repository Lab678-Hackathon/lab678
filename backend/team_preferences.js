/** 로컬 팀 화면의 대화 선호를 최종 확인·실제 추천 요청에 연결한다. 담당 원본에는 미반영. */
import { state } from './state.js';
import { cultureLabel } from './dj-culture.js';

export const preferenceFields = ['categories', 'music_followup', 'free_only', 'budget_krw', 'keywords',
  'exclude_terms', 'walking_preference', 'indoor_outdoor', 'unsupported_requirements'];

/** 최종 확인 시점의 선호를 복사해 요청에 고정한다. 이전 확정 요청을 나중 값으로 덮지 않는다. */
export function withPreferences(request) {
  const confirmed = { ...request, ...structuredClone(state.chat?.preferences || {}), culture_source: state.form.cultureSource || 'seoul' };
  if (state.chat) state.chat.confirmedDraft = structuredClone(confirmed);
  return confirmed;
}

/** 자동 설정과 아직 적용 못한 선호를 함께 읽을 수 있는 문장으로 만든다. */
export function preferenceText(p) {
  const items = [];
  if (p.categories?.length) items.push(`관심 활동: ${p.categories.join(' · ')}`);
  if (p.free_only) items.push('무료 행사만');
  if (typeof p.budget_krw === 'number') items.push(`1인 관람료 ${p.budget_krw.toLocaleString()}원 이내`);
  if (p.keywords?.length) items.push(`관심어 우선: ${p.keywords.join(', ')}`);
  if (p.exclude_terms?.length) items.push(`제외: ${p.exclude_terms.join(', ')}`);
  if (p.walking_preference === 'short') items.push('가까운 곳 우선 · 실제 도보·계단 확인 필요');
  if (p.indoor_outdoor && p.indoor_outdoor !== 'any') items.push(`${p.indoor_outdoor === 'indoor' ? '실내' : '실외'} 선호 · 데이터 미확인으로 선별 미적용`);
  if (p.unsupported_requirements?.length) items.push(`확인할 수 없는 필수 조건: ${p.unsupported_requirements.join(', ')}`);
  return items.join(' / ');
}

/** S02a에 추천으로 전달되는 선호를 평문으로 표시한다. */
export function renderPreferenceSummary(request) {
  let node = document.querySelector('#confirm-preferences');
  if (!node) {
    node = document.createElement('p'); node.id = 'confirm-preferences';
    document.querySelector('#confirm-rows').after(node);
  }
  node.textContent = cultureLabel(request.culture_source) + ' / ' + preferenceText(request);
}

/** 결과에 적용 선호·제한·빈 결과 의미를 표시한다. 미확인을 추천 성공으로 포장하지 않는다. */
export function renderResultPreferences() {
  if (location.hash !== '#/results' || !state.result) return;
  let node = document.querySelector('#result-preferences');
  if (!node) {
    node = document.createElement('section'); node.id = 'result-preferences';
    node.className = 'notice'; document.querySelector('#s03-found').before(node);
  }
  const r = state.result;
  const lines = [preferenceText(r.applied_preferences || {}), ...(r.preference_notes || []), r.coverage_note];
  if (r.status === 'no_results') lines.unshift('조회한 후보에서 조건에 맞는 장소를 찾지 못했어요. 조건은 그대로 유지했습니다. 조건 바꾸기로 관심사나 예산을 직접 바꿀 수 있어요.');
  node.replaceChildren(...lines.filter(Boolean).map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
}
