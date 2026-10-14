// Naver Maps 렌더 (LF-03, DESIGN §3.4) — 지도 풀스크린 + 부드러운 포커스 모션.
// - 출발점(Start) 핀 + 후보 번호/유형 핀(선택 시 CSS 트랜지션으로 확대)
// - 포커스 전환 시: 지도 카메라 pan(부드럽게) + 경로선 프로그레시브 draw.
//   임의 직선 금지 — 실제 Tmap path 가 있을 때만 그린다(PRD §7).
// - SDK 로드 실패(도메인 미등록 등) 시 지도 컨테이너를 숨긴다(카드는 그대로).
import { API_BASE } from "./config.js";
import { icon3dSrc, type3dSrc } from "./components/icons3d.js";

const TEAL = "#007385";
const WHITE = "#ffffff";
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let _loader = null;

async function loadNaver() {
  if (window.naver?.maps) return true;
  if (_loader) return _loader;
  _loader = (async () => {
    const cfg = await (await fetch(`${API_BASE}/api/config`)).json();
    const id = cfg.naver_map_client_id;
    if (!id) return false;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      // language=en → 지도 라벨(지명·건물명)을 영어로. 외국인 FIT 대상 서비스.
      s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(id)}&language=en`;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
    return !!window.naver?.maps;
  })().catch(() => false);
  return _loader;
}

function startPinHTML() {
  return '<div class="start-pin"></div>';
}

// 출발점 — 남색 점 + 회색 후광, 왼쪽에 3D 걷는 사람(36px). A·B 지도 공용(Figma v2).
function startPinWalkHTML() {
  return (
    '<div class="start-pin-wrap">' +
    `<img class="start-walker" src="${icon3dSrc("walking")}" width="36" height="36" alt="" aria-hidden="true" draggable="false" />` +
    '<span class="start-pin"></span>' +
    "</div>"
  );
}

// B 루트 지도 핀 — 번호만(순서가 중요). 청록 원 30 · 흰 테두리 2 · 흰 숫자 (Figma v2).
function numOnlyPinHTML(n) {
  return `<div class="num-pin">${n}</div>`;
}

// 경로선 2겹(흰 테두리 밑 + 청록 위) — 지도 길·건물 위에서도 선이 떠 보이게(Figma v2).
// outer=흰 테두리 두께, inner=청록 두께. 불투명 100%.
function drawRouteLines(maps, map, latlngs, outer, inner) {
  new maps.Polyline({
    map, path: latlngs, strokeColor: WHITE, strokeWeight: outer, strokeOpacity: 1,
    strokeLineCap: "round", strokeLineJoin: "round", zIndex: 1,
  });
  return new maps.Polyline({
    map, path: latlngs, strokeColor: TEAL, strokeWeight: inner, strokeOpacity: 1,
    strokeLineCap: "round", strokeLineJoin: "round", zIndex: 2,
  });
}

// A 결과 지도 핀 — 흰 원(40) + 3D 유형 아이콘(28), 번호는 우상단 청록 원(18).
// 선택 시 CSS 로 원 48·아이콘 34·청록 테두리 3 로 확대. 걷기 라벨은 포커스 때 텍스트 갱신.
function typePinHTML(type, n) {
  return (
    '<div class="map-pin">' +
    `<div class="map-pin-body"><img class="map-pin-icon" src="${type3dSrc(type)}" width="28" height="28" alt="" aria-hidden="true" draggable="false" /></div>` +
    `<span class="map-pin-num">${n}</span>` +
    '<span class="map-pin-walk"></span>' +
    "</div>"
  );
}

function midpoint(maps, a, b) {
  return new maps.LatLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
}

// 지도 렌더. 성공 시 { focus(id), onPinClick(cb) } 컨트롤러, 실패 시 null.
export async function renderMap(container, origin, candidates) {
  const ok = await loadNaver();
  if (!ok || !origin?.lat || !origin?.lng) {
    container.remove(); // 지도 불가 → 숨김(카드·딥링크는 유지)
    return null;
  }
  window.navermap_authFailure = () => container.remove();
  const { maps } = window.naver;
  const map = new maps.Map(container, {
    center: new maps.LatLng(origin.lat, origin.lng),
    zoom: 15,
    scaleControl: false,
    mapDataControl: false,
    logoControlOptions: { position: maps.Position.BOTTOM_RIGHT },
  });

  new maps.Marker({
    position: new maps.LatLng(origin.lat, origin.lng),
    map,
    // 출발 걷는 사람(왼쪽) + 남색 점 — 점 중심이 좌표에.
    icon: { content: startPinWalkHTML(), anchor: new maps.Point(47, 18) },
    zIndex: 50,
  });

  const bounds = new maps.LatLngBounds(
    new maps.LatLng(origin.lat, origin.lng),
    new maps.LatLng(origin.lat, origin.lng),
  );
  const entries = {};
  let pinClickCb = null;
  candidates.forEach((c, i) => {
    if (c.lat == null || c.lng == null) return;
    const pos = new maps.LatLng(c.lat, c.lng);
    const marker = new maps.Marker({
      position: pos,
      map,
      icon: { content: typePinHTML(c.type, i + 1), anchor: new maps.Point(20, 20) },
    });
    maps.Event.addListener(marker, "click", () => pinClickCb && pinClickCb(c.id));
    entries[c.id] = { marker, index: i, cand: c };
    bounds.extend(pos);
  });

  // 초기: 출발점+모든 핀을 지도 박스 안에 프레이밍(여백 확보).
  if (candidates.length)
    map.fitBounds(bounds, { top: 56, right: 48, bottom: 56, left: 48 });

  let routeLine = null;
  let routeAnim = 0;

  function drawRoute(cand) {
    cancelAnimationFrame(routeAnim);
    if (routeLine) {
      routeLine.setMap(null);
      routeLine = null;
    }
    const path = cand?.movement?.path;
    if (!path?.length) return; // 경로 데이터 없음 → 그리지 않음(직선 위조 금지)
    const latlngs = path.map(([la, ln]) => new maps.LatLng(la, ln));
    const style = {
      map,
      strokeColor: TEAL,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    };
    if (reduceMotion || latlngs.length < 3) {
      routeLine = new maps.Polyline({ ...style, path: latlngs });
      return;
    }
    // 프로그레시브 draw — 출발점에서 핀까지 선이 '이어지듯' 그려진다.
    routeLine = new maps.Polyline({ ...style, path: [latlngs[0]] });
    const DURATION = 450;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const n = Math.max(2, Math.ceil(t * latlngs.length));
      routeLine.setPath(latlngs.slice(0, n));
      if (t < 1) routeAnim = requestAnimationFrame(tick);
    };
    routeAnim = requestAnimationFrame(tick);
  }

  function focus(id) {
    const target = entries[id];
    for (const [cid, e] of Object.entries(entries)) {
      const sel = cid === id;
      const node = e.marker.getElement()?.querySelector(".map-pin");
      if (node) {
        node.classList.toggle("is-sel", sel);
        const walk = node.querySelector(".map-pin-walk");
        if (walk) walk.textContent = sel ? (e.cand.movement?.walk_minutes ? `≈${e.cand.movement.walk_minutes} min walk` : "") : "";
      }
      e.marker.setZIndex(sel ? 100 : 10);
    }
    drawRoute(target?.cand);
    // 카메라: 출발점↔포커스 핀 중점으로 부드럽게 이동(둘 다 화면에 유지).
    if (target?.cand?.lat != null && !reduceMotion) {
      map.panTo(midpoint(maps, origin, target.cand), {
        duration: 600,
        easing: "easeOutCubic",
      });
    }
  }

  // 실시간 현재 위치 마커(빨간 점 + pulse 링). watchPosition 콜백이 좌표를 밀어넣으면
  // 첫 호출에 생성, 이후 위치만 갱신한다. 경로 재계산은 하지 않는다(§6 #7 · Tmap 재호출 없음).
  let liveMarker = null;
  function setLiveLocation(lat, lng) {
    if (lat == null || lng == null) return;
    const pos = new maps.LatLng(lat, lng);
    if (!liveMarker) {
      liveMarker = new maps.Marker({
        position: pos,
        map,
        icon: {
          content:
            '<div class="live-loc"><span class="live-loc-ring"></span><span class="live-loc-dot"></span></div>',
          anchor: new maps.Point(13, 13),
        },
        zIndex: 200, // 출발/후보 핀 위에
      });
    } else {
      liveMarker.setPosition(pos);
    }
  }
  function clearLiveLocation() {
    if (liveMarker) {
      liveMarker.setMap(null);
      liveMarker = null;
    }
  }

  return {
    focus,
    onPinClick(cb) {
      pinClickCb = cb;
    },
    setLiveLocation,
    clearLiveLocation,
  };
}

// 루트 지도(B3·LF-08) — 출발점 + 순번 스톱 핀 + 구간 경로선(실제 Tmap path 이어붙임).
// 임의 직선 금지 — 측정된 구간 path 만 그린다. 실패/미등록 시 컨테이너 숨김(카드는 유지).
export async function renderRouteMap(container, origin, route) {
  const ok = await loadNaver();
  if (!ok || !origin?.lat || !origin?.lng) {
    container.remove();
    return null;
  }
  window.navermap_authFailure = () => container.remove();
  const { maps } = window.naver;
  const map = new maps.Map(container, {
    center: new maps.LatLng(origin.lat, origin.lng),
    zoom: 15,
    scaleControl: false,
    mapDataControl: false,
    logoControlOptions: { position: maps.Position.BOTTOM_RIGHT },
  });
  new maps.Marker({
    position: new maps.LatLng(origin.lat, origin.lng),
    map,
    // 출발 걷는 사람(왼쪽) + 남색 점 — 점 중심이 좌표에 오도록 anchor.
    icon: { content: startPinWalkHTML(), anchor: new maps.Point(47, 18) },
    zIndex: 50,
  });
  const bounds = new maps.LatLngBounds(
    new maps.LatLng(origin.lat, origin.lng),
    new maps.LatLng(origin.lat, origin.lng),
  );
  (route.stops ?? []).forEach((s, i) => {
    const c = s.candidate;
    if (c?.lat == null || c?.lng == null) return;
    const pos = new maps.LatLng(c.lat, c.lng);
    new maps.Marker({
      position: pos,
      map,
      // B 핀은 번호만(순서가 중요 — 유형 아이콘 미표기). 유형은 타임라인 태그로.
      icon: { content: numOnlyPinHTML(i + 1), anchor: new maps.Point(15, 15) },
    });
    bounds.extend(pos);
  });
  // 구간 path 를 순서대로 이어붙여 전체 동선 1선으로(측정된 구간만).
  const latlngs = [];
  for (const seg of route.segments ?? []) {
    const p = seg.movement?.path;
    if (p?.length) for (const [la, ln] of p) latlngs.push(new maps.LatLng(la, ln));
  }
  // 흰 테두리 9 + 청록 5 (불투명 100%).
  if (latlngs.length) drawRouteLines(maps, map, latlngs, 9, 5);
  map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  return { map };
}

// 미니맵(홈 현재선택 카드) — 비상호작용, 출발점+단일 핀+실제 경로만. 실패 시 숨김.
export async function renderMiniMap(container, origin, candidate) {
  const ok = await loadNaver();
  if (!ok || !origin?.lat || !origin?.lng || candidate?.lat == null) {
    container.remove();
    return null;
  }
  window.navermap_authFailure = () => container.remove();
  const { maps } = window.naver;
  const map = new maps.Map(container, {
    center: new maps.LatLng(candidate.lat, candidate.lng),
    zoom: 14,
    draggable: false,
    pinchZoom: false,
    scrollWheel: false,
    keyboardShortcuts: false,
    disableDoubleTapZoom: true,
    disableDoubleClickZoom: true,
    scaleControl: false,
    mapDataControl: false,
    logoControl: false,
  });
  new maps.Marker({
    position: new maps.LatLng(origin.lat, origin.lng),
    map,
    icon: { content: startPinHTML(), anchor: new maps.Point(9, 9) },
    zIndex: 50,
  });
  new maps.Marker({
    position: new maps.LatLng(candidate.lat, candidate.lng),
    map,
    icon: { content: typePinHTML(candidate.type, 1), anchor: new maps.Point(20, 20) },
    zIndex: 100,
  });
  const path = candidate.movement?.path;
  // 미니 지도 경로선 — 흰 테두리 8 + 청록 4 (Figma v2).
  if (path?.length)
    drawRouteLines(maps, map, path.map(([la, ln]) => new maps.LatLng(la, ln)), 8, 4);
  const bounds = new maps.LatLngBounds(
    new maps.LatLng(origin.lat, origin.lng),
    new maps.LatLng(candidate.lat, candidate.lng),
  );
  map.fitBounds(bounds, { top: 20, right: 24, bottom: 20, left: 24 });
  // 선택 핀 강조
  requestAnimationFrame(() => {
    const el = container.querySelector(".map-pin");
    if (el) el.classList.add("is-sel");
  });
  return { map };
}
