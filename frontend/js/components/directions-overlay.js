// Directions 오버레이 — 외부 Naver 길찾기는 iframe 임베드가 막혀 있어(X-Frame-Options: DENY)
// 대신 인앱 풀스크린 지도(Naver SDK + 측정된 Tmap 경로선)로 개요를 보여주고, 상세 턴바이턴은
// "Open in Naver Map ↗" 로 외부 연결한다. X 버튼으로 바로 앱에 복귀(§4.3 직선 위조 금지 유지).
import { el } from "./sheet.js";
import { directionsUrl, formatDistance } from "./result-card.js";
import { renderMap } from "../map.js";
import { icon3d } from "./icons3d.js";

export function openDirectionsOverlay({ origin, candidate }) {
  const url = directionsUrl(origin, candidate);
  const host = document.querySelector(".device-frame") || document.body;

  const overlay = el("div", "dir-overlay");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Directions");

  // head: X(닫기) + 목적지 제목
  const head = el("div", "dir-head");
  const close = el("button", "dir-close", "✕");
  close.type = "button";
  close.setAttribute("aria-label", "Close directions");
  const title = el("div", "dir-title");
  title.append(
    el("span", "dir-title-eyebrow", "Directions"),
    el("span", "dir-title-main", candidate.title ?? "Destination"),
  );
  head.append(close, title);
  overlay.append(head);

  // 지도 영역 — renderMap 이 SDK 실패 시 컨테이너를 제거하므로 래퍼를 따로 둔다(푸터 유지).
  const mapWrap = el("div", "dir-map-wrap");
  const mapCanvas = el("div", "dir-map-canvas");
  mapWrap.append(mapCanvas);
  overlay.append(mapWrap);

  // 푸터 — 이동 요약(측정된 값만) + 외부 상세 길찾기 연결
  const footer = el("div", "dir-foot");
  const mv = candidate.movement;
  if (mv?.display) {
    const dist = formatDistance(mv.distance_m);
    const summary = el("div", "dir-summary", dist ? `${mv.display} · ${dist}` : mv.display);
    if (mv.provenance === "estimate") summary.classList.add("is-estimate");
    footer.append(summary);
  }
  const openBtn = el("button", "dir-open", "");
  openBtn.type = "button";
  openBtn.innerHTML = 'Open in Naver Map <span aria-hidden="true">↗</span>';
  openBtn.disabled = !url;
  openBtn.addEventListener("click", () => {
    if (url) window.open(url, "_blank", "noopener");
  });
  footer.append(openBtn);
  overlay.append(footer);

  let closed = false;
  let watchId = null;
  let mapCtrl = null;
  function dismiss() {
    if (closed) return;
    closed = true;
    // 위치 추적 해제 — 위치는 클라이언트에만 두고 오버레이를 닫으면 바로 구독 종료.
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    mapCtrl?.clearLiveLocation();
    overlay.classList.remove("is-open");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => overlay.remove(), 200);
  }
  function onKey(e) {
    if (e.key === "Escape") dismiss();
  }
  close.addEventListener("click", dismiss);
  document.addEventListener("keydown", onKey);

  host.append(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  // 인앱 개요 지도 — 출발점 + 목적지 핀 + 측정된 경로선(focus 로 그리기). SDK 실패는 graceful:
  // renderMap 이 캔버스를 제거하면 지도 자리에 안내만 남고 푸터(외부 링크)는 그대로 쓸 수 있다.
  renderMap(mapCanvas, origin, [candidate])
    .then((ctrl) => {
      if (closed) return;
      if (!ctrl) {
        mapWrap.append(el("p", "dir-map-fallback", "Map unavailable — open full directions below."));
        return;
      }
      mapCtrl = ctrl;
      ctrl.focus(candidate.id);

      // "내 위치" 버튼 — 지도 위 우하단 플로팅. 현 위치로 카메라 이동 + follow 토글.
      // 첫 GPS fix 수신 전까지는 비활성, follow ON 이면 활성 스타일로 표시.
      const locBtn = el("button", "dir-locate");
      locBtn.type = "button";
      locBtn.setAttribute("aria-label", "Recenter to my location");
      locBtn.append(icon3d("locate", { size: 30, className: "dir-locate-ico" }));
      locBtn.disabled = true;
      locBtn.addEventListener("click", () => ctrl.recenterLive());
      ctrl.onFollowChange((isFollowing, hasLive) => {
        locBtn.disabled = !hasLive;
        locBtn.classList.toggle("is-active", isFollowing);
      });
      mapWrap.append(locBtn);

      // 실시간 현재 위치(빨간 점 + pulse) — 표시 전용. 이동에 따라 점만 갱신하고 경로는
      // 재계산하지 않는다(Tmap 재호출 없음·§6 #7). 권한 거부/실패는 조용히 점만 생략.
      // maximumAge 1000: 거의 실시간 fix(캐시 재사용 최소)로 이동을 촘촘히 포착.
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (p) => {
            if (!closed) ctrl.setLiveLocation(p.coords.latitude, p.coords.longitude);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
        );
      }
    })
    .catch(() => {
      if (!closed) mapWrap.append(el("p", "dir-map-fallback", "Map unavailable — open full directions below."));
    });

  return { close: dismiss };
}
