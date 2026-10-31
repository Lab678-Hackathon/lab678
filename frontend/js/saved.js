/**
 * 체험 모드와 내 나들이 저장 (S06·S07). 로그인 없이 이 브라우저(localStorage)에만 저장해요.
 * 저장 요청은 체험 시작 전이면 한 번 보관했다가, 체험을 시작하면 추가 클릭 없이 1회 실행해요.
 */
import { readStore, writeStore } from './util.js';

const KEYS = { signedIn: 'demoSignedIn', places: 'demo_saved_places' };

export const isSignedIn = () => readStore(KEYS.signedIn) === true;

/** @returns {object[]} 저장한 장소 (후보 객체 + savedAt) */
export const savedPlaces = () => {
  const list = readStore(KEYS.places, []);
  return Array.isArray(list) ? list : [];
};

export const isSaved = (id) => savedPlaces().some((p) => p.id === id);

/** 체험 시작. 성공하면 true */
export const startDemo = () => writeStore(KEYS.signedIn, true);

/**
 * 장소 저장. 같은 장소는 한 번만 저장돼요.
 * @param {object} candidate
 * @returns {'saved'|'already'|'failed'}
 */
export function savePlace(candidate) {
  const list = savedPlaces();
  if (list.some((p) => p.id === candidate.id)) return 'already';
  const ok = writeStore(KEYS.places, [{ ...candidate, savedAt: new Date().toISOString() }, ...list]);
  return ok ? 'saved' : 'failed';
}

/**
 * 체험 종료: 체험 상태와 저장한 장소를 모두 지워요.
 * @returns {boolean} 다 지웠으면 true (실패하면 목록을 그대로 둬요)
 */
export function endDemo() {
  const a = writeStore(KEYS.places, null);
  const b = writeStore(KEYS.signedIn, null);
  return a && b && savedPlaces().length === 0 && !isSignedIn();
}
