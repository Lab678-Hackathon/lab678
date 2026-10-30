/**
 * 앱 부트스트랩 — Core
 * 역할: 초기화, 메뉴 렌더, 페이지 전환.
 * 이 파일에 도메인 로직을 넣지 않는다.
 *
 * 새 페이지 추가 방법:
 *   1. pages/[page].js 작성
 *   2. content.js CONTENT.menu에 메뉴 추가
 *   3. 아래 _registerRoutes()에 register() 호출 추가
 */
import { init as initAuth, onAuthChange } from "./auth.js";
import { register, navigate } from "./router.js";
import { CONTENT } from "./content.js";

const _view = document.getElementById("view");
const _nav  = document.getElementById("nav");
let _currentPage = "";

/** ── 라우트 등록 (Topic 페이지 추가 시 여기에 추가) ── */
function _registerRoutes() {
  // 예시: register("home", () => import("./pages/home.js").then(m => m.showHome));
  // Topic 페이지는 이 블록에 추가한다.
}

/** ── 메뉴 렌더 ── */
function _renderNav() {
  if (!_nav) return;
  _nav.innerHTML = Object.entries(CONTENT.menu)
    .map(([key, label]) => `
      <button class="nav-item ${_currentPage === key ? "active" : ""}"
              data-page="${key}">${label}</button>
    `)
    .join("");

  _nav.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => _goto(btn.dataset.page));
  });
}

/** ── 페이지 전환 ── */
async function _goto(page) {
  _currentPage = page;
  _renderNav();
  await navigate(page, _view);
}

/** ── 부트스트랩 ── */
export async function boot() {
  _registerRoutes();
  await initAuth();
  onAuthChange(() => _renderNav());
  _renderNav();

  const firstPage = Object.keys(CONTENT.menu)[0];
  if (firstPage) await _goto(firstPage);
}

document.addEventListener("DOMContentLoaded", boot);
