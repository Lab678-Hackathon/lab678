// 3D 아이콘 시스템 (Figma v2) — v2부터 아이콘은 3D PNG 하나로 통일한다(2D·선 아이콘 미사용).
// 파일: assets/icons/ 512×512 투명 PNG(본체 ~420px) → 코드에서 원하는 크기로 축소.
// 유형 키 = 파일명 규칙 (예: hands_on → icon-3d-type-hands-on.png). 모양 바뀌어도 key 고정.
const BASE = "assets/icons/";

// 문화경험 유형 → 3D 아이콘 파일. key 는 백엔드 candidate.type 값과 일치.
export const TYPE_ICON_3D = {
  historic_visit: "icon-3d-type-historic-visit.png",
  exhibition: "icon-3d-type-exhibition.png",
  performance: "icon-3d-type-performance.png",
  hands_on: "icon-3d-type-hands-on.png",
  festival_event: "icon-3d-type-festival-event.png",
  default: "icon-3d-type-default.png", // 유형 없음 → 목적지 핀과 같은 그림
};

// 비(非)유형 — 크롬·지도용 3D 아이콘.
export const ICON_3D = {
  home: "icon-3d-home.png",
  destination: "icon-3d-destination.png",
  walking: "icon-3d-walking.png",
  profile: "icon-3d-profile.png",
};

// 유형 라벨(접근성 alt·태그 텍스트). 사용자-facing 영어.
export const TYPE_LABEL_3D = {
  historic_visit: "Historic visit",
  exhibition: "Exhibition",
  performance: "Performance",
  hands_on: "Hands-on",
  festival_event: "Festival & event",
  default: "",
};

// 유형 3D 아이콘 <img>. size=px(기본 24 — 사용 규칙: 카드·지도 라벨 유형 태그 24).
export function typeIcon3d(type, { size = 24, className = "", alt } = {}) {
  const label = alt ?? TYPE_LABEL_3D[type] ?? "";
  return icon3dImg(type3dSrc(type), size, className, label);
}

// 크롬 3D 아이콘 <img> (home·destination·walking·profile).
export function icon3d(name, { size = 24, className = "", alt = "" } = {}) {
  return icon3dImg(icon3dSrc(name), size, className, alt);
}

// 지도 마커 등 HTML 문자열을 만드는 곳에서 쓰는 src 경로 헬퍼.
export function type3dSrc(type) {
  return BASE + (TYPE_ICON_3D[type] ?? TYPE_ICON_3D.default);
}
export function icon3dSrc(name) {
  return BASE + (ICON_3D[name] ?? ICON_3D.home);
}

function icon3dImg(src, size, className, alt) {
  const img = document.createElement("img");
  img.src = src;
  img.width = size;
  img.height = size;
  if (alt) img.alt = alt;
  else img.setAttribute("aria-hidden", "true"); // 장식용 — 보조기술에서 숨김
  img.className = ("icon-3d " + className).trim();
  img.draggable = false;
  return img;
}
