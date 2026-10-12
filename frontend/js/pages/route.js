// 저장된 B 문화루트 상세 뷰 — 재조립된 RouteData 를 '경로선 지도 + 루트 카드'로 렌더.
// 챗의 renderRoute 와 같은 컴포넌트(renderRouteMap·renderRouteCard)를 재사용한다. 사실·경로선은
// 저장하지 않고 열 때 라이브 재조립된 값(state.rebuildSavedRoute)을 표시한다. 선택 ≠ 방문.
import { renderRouteCard } from "../components/route-card.js";
import { renderRouteMap } from "../map.js";

const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const HOME =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>';

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// renderRouteView({ data, trip, onBack, onHome })
// data: 재조립된 RouteData(routes/origin). trip: { start_at, end_at } ISO(카드 날짜·시간용) | null.
export function renderRouteView({ data, trip, onBack, onHome } = {}) {
  const root = el("section", "mypage route-view");

  // Nav — chevron Back · Your route · Home(우상단). My Page 와 동일 패턴.
  const nav = el("div", "input-nav");
  const back = el("button", "nav-back");
  back.type = "button";
  back.setAttribute("aria-label", "Back");
  back.innerHTML = CHEVRON;
  back.addEventListener("click", () => onBack?.());
  const home = el("button", "nav-home");
  home.type = "button";
  home.setAttribute("aria-label", "Home");
  home.innerHTML = HOME;
  home.addEventListener("click", () => onHome?.());
  nav.append(back, el("span", "nav-title", "Your route"), home);
  root.append(nav);

  const body = el("div", "mypage-body");
  root.append(body);

  const route = (data?.routes || [])[0];
  if (!route) {
    // 재조립이 비면(심야·스톱 변동 등) 사실을 꾸미지 않고 투명하게 알린다.
    body.append(
      el(
        "p",
        "mypage-pref-empty",
        data?.unmet ||
          "We couldn't rebuild this route right now — the places may be closed at this time. Try again later.",
      ),
    );
    return root;
  }

  // 경로선 지도(Tmap provenance 포함) — 실패하면 지도만 조용히 제거(직선 위조 금지, graceful).
  const mapEl = el("div", "chat-map");
  body.append(mapEl);
  renderRouteMap(mapEl, data.origin, route).catch(() => mapEl.remove());

  // 하루 1코스 카드(타임라인·스톱별 이유·총계). 저장 루트는 편집 아님 → onRemove 없음.
  body.append(renderRouteCard(route, data.origin, { trip }));
  return root;
}
