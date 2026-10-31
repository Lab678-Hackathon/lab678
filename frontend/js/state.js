/**
 * 화면 사이에서 공유하는 상태. 새로고침해도 입력·결과가 남도록 sessionStorage 에 보관해요.
 * form: S02 입력값 / confirmed: S02a 에서 확인한 요청 / result: 추천 응답 / selectedId: S04 에서 고른 장소
 */
const KEY = 'lab678_flow';

const empty = () => ({
  form: { startKey: '', date: '', startTime: '', endTime: '', category: '', kind: 'place' },
  confirmed: null,
  result: null,
  shownIds: [],
  activeId: null,
  selectedId: null,
});

/** @returns {ReturnType<typeof empty>} */
function load() {
  try {
    return { ...empty(), ...JSON.parse(sessionStorage.getItem(KEY) || '{}') };
  } catch {
    return empty();
  }
}

export const state = load();

/** 지금 상태를 저장해요. 저장이 막혀도 화면은 계속 동작해요. */
export function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 무시 */ }
}

/**
 * 추천 결과에서 id 로 후보를 찾아요. S03 카드와 S04 상세가 같은 객체를 써요.
 * @param {string} id
 */
export function candidateById(id) {
  return state.result?.candidates?.find((c) => c.id === id) || null;
}
