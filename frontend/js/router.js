/**
 * 라우터 — Core
 * 메뉴 이름 → 페이지 함수 매핑.
 * Topic 페이지 추가 시 이 파일에만 등록하면 됨.
 *
 * 사용법:
 *   import { register, navigate } from './router.js';
 *   register('home', () => import('./pages/home.js').then(m => m.showHome));
 *   navigate('home');
 */

/** @type {Map<string, () => Promise<Function>>} */
const _routes = new Map();

/**
 * 메뉴 이름과 페이지 로더를 등록.
 * @param {string} name 메뉴 식별자
 * @param {() => Promise<Function>} loader 페이지 함수를 반환하는 dynamic import
 */
export function register(name, loader) {
  _routes.set(name, loader);
}

/**
 * 지정한 페이지로 이동.
 * @param {string} name 등록된 메뉴 이름
 * @param {HTMLElement} container 렌더링할 DOM 컨테이너
 */
export async function navigate(name, container) {
  const loader = _routes.get(name);
  if (!loader) {
    console.error(`[router] 등록되지 않은 페이지: ${name}`);
    return;
  }
  const showPage = await loader();
  await showPage(container);
}

/** 현재 등록된 라우트 목록. */
export function routes() {
  return [..._routes.keys()];
}
