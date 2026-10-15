// LF-01 · 메인 홈 (M-1 첫 방문 / M-2 현재 선택 있음).
// A 즉시추천 = 활성, B 문화루트·Log in = 디자인 구현하되 비활성(Phase 2).
// 현재 선택이 있으면(A6 localStorage) 재접근 카드 + 미니맵을 상단에 노출.
import { displayName, signInWithGoogle } from "../auth.js";
import { icon3d } from "../components/icons3d.js";
import { renderMiniMap } from "../map.js";
import {
  clearChoice,
  clearRoute,
  isLoggedIn,
  loadChoice,
  loadRoute,
} from "../state.js";
import { renderSavedRouteCard } from "../components/saved-route-card.js";

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function fmtTime(iso) {
  // 사용자-facing 문자열은 영어 우선(CLAUDE §5).
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// "SEOUL · MON, OCT 6 · 3:14 PM"
function nowStamp() {
  const d = new Date();
  const date = d
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
  return `SEOUL · ${date} · ${fmtTime(d)}`;
}

// 비활성 코어액션 카드(B) — 클릭 불가, 'Coming soon' 배지.
function coreAction({ kicker, title, sub, cta, image, disabled, onClick }) {
  const card = el("button", "core-action");
  card.type = "button";
  if (disabled) {
    card.classList.add("is-disabled");
    card.disabled = true;
    card.setAttribute("aria-disabled", "true");
  } else {
    card.addEventListener("click", onClick);
  }
  const illo = el("div", "core-illo");
  // 카드 그림(Figma v2) — A=서울 전경, B=문화 루트 일러스트. 첫방문·재방문·로그인 공통.
  if (image) illo.style.backgroundImage = `url("assets/img/${image}")`;
  if (disabled) illo.append(el("span", "soon-badge", "Phase 2"));
  const body = el("div", "core-body");
  body.append(
    el("span", "core-kicker", kicker),
    el("h3", "core-title", title),
    el("p", "core-sub", sub),
  );
  const ctaEl = el("span", "core-cta", cta);
  body.append(ctaEl);
  card.append(illo, body);
  return card;
}

export function renderHomeView({
  onStartA,
  onOpenChat,
  onViewChoice,
  onOpenMyPage,
  onViewRoute,
}) {
  const root = el("section", "home");

  // 소프트 헤더 배경(일러스트 자리) — 토큰 그라디언트.
  root.append(el("div", "home-header-bg"));

  const content = el("div", "home-content");

  // 브랜드 행 (KONNECT · EN · [Account]) — Account 는 로그인(비익명) 시에만(L3 진입점).
  const brand = el("div", "home-brand");
  brand.append(el("span", "home-logo", "KONNECT"));
  const brandRight = el("div", "home-brand-right");
  brandRight.append(el("span", "home-lang", "EN"));
  // 프로필 아이콘 — 상단 우측 상시 노출(디자인 10/8: 하단 Log in → 상단 프로필 아이콘).
  // 로그인 시 이니셜 → My Page, 비로그인 시 사람 글리프 → Google 로그인.
  const account = el("button", "home-account");
  account.type = "button";
  if (isLoggedIn()) {
    const name = displayName();
    account.textContent = name ? name.trim()[0].toUpperCase() : "👤";
    account.title = "My Page";
    account.setAttribute("aria-label", "My Page");
    account.addEventListener("click", () => onOpenMyPage?.());
  } else {
    // 로그인 전 — 3D 프로필 아이콘(28px, 흰 원 32 안). 사용 규칙(Figma v2).
    account.append(icon3d("profile", { size: 28 }));
    account.title = "Log in";
    account.setAttribute("aria-label", "Log in");
    account.addEventListener("click", async () => {
      account.disabled = true;
      try {
        await signInWithGoogle(); // 성공 시 Google 로 리다이렉트
      } catch (e) {
        account.disabled = false;
        account.title = "Sign-in is unavailable right now.";
        console.warn("google sign-in failed:", e?.message || e);
      }
    });
  }
  brandRight.append(account);
  brand.append(brandRight);
  content.append(brand);

  // 인사 — 메인 구성을 첫방문·재방문·로그인 모두 동일하게(A/B 카드 먼저). 재방문/로그인은
  // 큰 제목 "Welcome back[, Name]", 첫방문은 안내 제목. (Figma v2 메인 재구성)
  const name = isLoggedIn() ? displayName() : null;

  // M-2 현재 선택(선택 ≠ 방문)은 아래에서 쓰지만, 제목·안내문 분기를 위해 먼저 로드.
  const saved = loadChoice();
  const savedCand = saved?.env?.data?.candidates?.find(
    (c) => c.id === saved.candidateId,
  );
  // 재방문 = 로그인했거나 현재 선택이 있음(저장 루트는 비동기 → 로드 후 보정).
  let revisit = !!name || !!savedCand;
  const titleFor = (rv) =>
    name
      ? `Welcome back, ${name.split(" ")[0]}`
      : rv
        ? "Welcome back"
        : "Find a cultural experience that fits your day.";

  const greeting = el("div", "home-greeting");
  const homeHead = el("h1", "home-head", titleFor(revisit));
  greeting.append(el("p", "home-stamp", nowStamp()), homeHead);
  content.append(greeting);

  // 코어 액션 A / B (동급 2열) — 메인 최상단(첫방문과 같은 자리).
  const actions = el("div", "core-actions");
  actions.append(
    coreAction({
      kicker: "EXPLORE NOW",
      title: "Right now",
      sub: "Fits your location and the time you have.",
      cta: "Find experiences",
      image: "card-a-right-now.png",
      disabled: false,
      onClick: onStartA,
    }),
    coreAction({
      kicker: "PLAN AHEAD",
      title: "Plan a route",
      sub: "2+ cultural experiences for a date you choose.",
      cta: "Create a route",
      image: "card-b-plan-a-route.png",
      disabled: false,
      onClick: onOpenChat,
    }),
  );
  content.append(actions);

  // 현재 선택·루트는 A/B 카드 아래 섹션으로(재방문 시). 신뢰 안내(한 줄)는 첫방문에서만.

  // M-2 · 현재 선택 재접근 (선택 ≠ 방문)
  if (savedCand) {
    const choice = el("div", "choice-card");
    const head = el("div", "choice-card-head");
    head.append(
      el("span", "choice-tag", "My Pick"),
      el("span", "choice-when", "Today"),
    );
    const clear = el("button", "choice-clear", "✕");
    clear.type = "button";
    clear.title = "Clear My Pick";
    clear.addEventListener("click", (e) => {
      e.stopPropagation();
      clearChoice();
      choice.remove();
    });
    head.append(clear);

    const miniEl = el("div", "mini-map");
    const info = el("div", "choice-card-info");
    const texts = el("div", "choice-card-texts");
    texts.append(
      el("span", "choice-card-title", savedCand.title),
      el(
        "span",
        "choice-card-sub",
        `${fmtTime(saved.request.start_at)} session · from ${saved.request.start_location.label}`,
      ),
    );
    const view = el("span", "choice-card-view", "View →");
    info.append(texts, view);

    choice.append(head, miniEl, info);
    choice.addEventListener("click", () =>
      onViewChoice({ request: saved.request, env: saved.env }),
    );
    content.append(choice);

    // 미니맵: 실제 좌표·실제 경로만(임의 직선 금지). 실패 시 패널 숨김.
    renderMiniMap(miniEl, saved.env.data.origin, savedCand).catch(() => {});
  }

  // 저장된 B 문화루트(DB 정본) — 비동기 로드 후 라이브 재조립해 선택 카드 아래 삽입.
  // 참조만 저장했으므로 매번 신선 재조회(캐싱 금지 준수). 로그인·세션 없으면 조용히 생략.
  const routeSlot = el("div", "home-route-slot");
  content.append(routeSlot);

  (async () => {
    // 참조(ref)만 로드해 카드를 즉시 렌더 — 라이브 재조립은 View 누르는 순간(showSavedRoute)
    // 에서 스플래시와 함께 수행한다(홈 로드 시 선재조립 → 카드가 뒤늦게 뜨던 문제 해소).
    const ref = await loadRoute();
    if (!ref) return;
    // 저장 루트만 있는 비로그인 재방문 보정 — 제목을 재방문형으로.
    if (!revisit) {
      revisit = true;
      homeHead.textContent = titleFor(true);
    }
    const cardEl = renderSavedRouteCard(null, ref, {
      onClear: () => {
        clearRoute();
        routeSlot.replaceChildren();
      },
      onView: () => onViewRoute?.(ref),
    });
    if (cardEl) routeSlot.append(cardEl);
  })();

  root.append(content);
  return root;
}
