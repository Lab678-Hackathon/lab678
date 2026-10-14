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

  const hero = el("div", "welcome-hero");
  const brand = el("div", "welcome-brand");
  brand.append(
    el("h1", "welcome-logo", "KONNECT"),
    el("p", "welcome-tagline", "Seoul culture, made doable"),
  );
  hero.append(brand);
  root.append(hero);

  const ctaWrap = el("div", "welcome-cta");
  const cta = el("button", "btn-cta", "Get started →");
  cta.type = "button";
  cta.addEventListener("click", onStart);
  ctaWrap.append(cta);
  root.append(ctaWrap);

  return root;
}
