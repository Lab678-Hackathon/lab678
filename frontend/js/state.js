/**
 * 전역 공유 상태 — Core
 * 페이지 간 공유가 필요한 값만 저장.
 * 폼 입력·로딩 여부·오류 문구는 각 페이지가 로컬로 관리.
 */

export const state = {
  /** @type {import('./auth.js').Session|null} 현재 로그인 세션 */
  session: null,

  /** @type {any|null} 마지막 추천 요청 파라미터 */
  lastRequest: null,

  /** @type {any[]|null} 마지막 추천 결과 목록 */
  lastResults: null,

  /** @type {string|null} 현재 선택된 후보 ID */
  selectedId: null,

  /** @type {{lat:number,lng:number}|null} 현재 사용자 위치 */
  currentLocation: null,
};

/**
 * 추천 결과를 상태에 저장.
 * @param {any} request
 * @param {any[]} results
 */
export function setResults(request, results) {
  state.lastRequest = request;
  state.lastResults = results;
  state.selectedId  = null;
}

/**
 * GPS 위치 1회 요청·캐시. 반복 요청 없음.
 * @returns {Promise<{lat:number,lng:number}|null>}
 */
export async function ensureLocation() {
  if (state.currentLocation) return state.currentLocation;
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        state.currentLocation = { lat: coords.latitude, lng: coords.longitude };
        resolve(state.currentLocation);
      },
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}
