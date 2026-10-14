// W-0 · 웰컴 (LF-01 첫 실행 1회). 풀스크린 히어로 + Get started 버튼만(하단).
// 히어로 배경 = Figma Seoul 일러스트(assets/img/welcome-hero.png) — .welcome 배경에 적용.
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export function renderWelcomeView({ onStart }) {
  const root = el("section", "welcome");

  // 상단: 서울 일러스트 블록(브랜드 오버레이) — 화면을 꽉 채우지 않고 상단만.
  const hero = el("div", "welcome-hero");
  const brand = el("div", "welcome-brand");
  brand.append(
    el("h1", "welcome-logo", "KONNECT"),
    el("p", "welcome-tagline", "Seoul culture, made doable"),
  );
  hero.append(brand);
  root.append(hero);

  // 하단: 흰 영역 — 한 줄 가치 제안 + Get started.
  const foot = el("div", "welcome-foot");
  foot.append(
    el("h2", "welcome-head", "Find a cultural experience that fits your day."),
    el(
      "p",
      "welcome-sub",
      "Right now nearby, or on any day of your trip — with what to check before you go.",
    ),
  );
  const cta = el("button", "btn-cta", "Get started →");
  cta.type = "button";
  cta.addEventListener("click", onStart);
  foot.append(cta);
  root.append(foot);

  return root;
}
