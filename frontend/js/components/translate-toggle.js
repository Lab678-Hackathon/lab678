// 결과 상단 "Translate" 토글 — 한글 유래 표시(제목·가격)를 온디맨드로 영어 의미번역.
// 기본 표시는 결정론(로마자·₩금액)으로 항상 읽히고, 이 토글을 켤 때만 백엔드 LLM 번역을
// 1회 호출해 해당 영역의 [data-ko] 요소 텍스트를 바꾼다(핫패스 아님 · 결과는 캐시해 재토글
// 시 재호출 없음 · 원문은 data-orig 에 보관해 끄면 복원). 번역은 사실 생성이 아니라 표시 전용.
import { translateTexts } from "../api.js";

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// getScope(): 번역 대상 [data-ko] 를 찾을 루트 요소를 반환(클릭 시점에 평가).
// onError(msg): 실패 알림(토스트 등) — 없으면 콘솔 경고만.
export function createTranslateToggle(getScope, { onError } = {}) {
  const btn = el("button", "translate-toggle");
  btn.type = "button";
  let on = false;
  let busy = false;
  let cache = null; // { 원문: 번역 } — 한 번 받으면 재사용

  // 라벨은 번역 이모지(🌐) 고정 — 텍스트 "Translate"는 과해 아이콘만 쓴다. 활성/비활성은
  // 색(aria-pressed)으로 구분. 아이콘 전용이라 스크린리더용 aria-label/title 을 둔다(접근성).
  function syncState() {
    btn.textContent = "🌐";
    btn.setAttribute("aria-pressed", String(on));
    const label = on ? "Show original" : "Translate";
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  syncState();

  function patch(scope, map) {
    for (const node of scope.querySelectorAll("[data-ko]")) {
      const en = map[node.dataset.ko];
      if (!en) continue;
      if (node.dataset.orig == null) node.dataset.orig = node.textContent;
      node.textContent = en;
    }
  }
  function restore(scope) {
    for (const node of scope.querySelectorAll("[data-ko]"))
      if (node.dataset.orig != null) node.textContent = node.dataset.orig;
  }

  btn.addEventListener("click", async (e) => {
    e.stopPropagation(); // 카드 포커스/클릭 핸들러로 버블링 방지
    if (busy) return;
    const scope = getScope();
    if (!scope) return;

    if (on) {
      restore(scope);
      on = false;
      syncState();
      return;
    }
    busy = true;
    btn.classList.add("is-busy"); // 라벨은 그대로, 진행 중 색만 살짝 흐리게
    try {
      if (!cache) {
        const nodes = [...scope.querySelectorAll("[data-ko]")];
        const texts = [...new Set(nodes.map((n) => n.dataset.ko).filter(Boolean))];
        if (texts.length) {
          const env = await translateTexts(texts);
          if (!env?.ok) throw new Error(env?.error?.message || "translate failed");
          cache = env.data?.translations || {};
        } else {
          cache = {};
        }
      }
      patch(scope, cache);
      on = true;
      syncState();
    } catch (err) {
      cache = null; // 다음 시도에서 다시 받도록
      (onError || ((m) => console.warn("translate:", m)))(
        "Translation unavailable right now",
      );
      syncState();
    } finally {
      busy = false;
      btn.classList.remove("is-busy");
    }
  });

  return btn;
}
