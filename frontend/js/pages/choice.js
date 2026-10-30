// LF-09 · 선택 상세 (저장 전/후). 10/8 멘토링 "저장 동작 명확하게".
//  - 저장 전(9-1a/b/c): 제목 "Save to My Pick?", "Not saved yet", 버튼 "Save to My Pick".
//  - 저장 후(9-1·9-1s): 제목 "My Pick", 버튼 "See on map", toast "Saved to My Pick".
// 선택 ≠ 방문(booking 아님) 고지를 양쪽 모두 유지. 저장 전엔 My Pick으로 안 보인다.
import { isLoggedIn, saveChoice } from "../state.js";
import { showLoginSheet } from "../components/login-sheet.js";
import { icon3d } from "../components/icons3d.js";
import { directionsUrl } from "../components/result-card.js";
import { openDirectionsOverlay } from "../components/directions-overlay.js";
import { createTranslateToggle } from "../components/translate-toggle.js";

const HANGUL = /[가-힣]/; // 번역 토글 노출·대상 판정(제목 원문·가격 원문에 한글 있는지)

const STATUS_LABEL = {
  fits: "Fits your conditions",
  check_needed: "Partially confirmed",
  alternative: "Alternative",
};

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

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function tripStamp(startIso, endIso) {
  const d = new Date(startIso);
  const today = new Date();
  const dayLabel =
    d.toDateString() === today.toDateString()
      ? "TODAY"
      : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const date = d
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
  return `${dayLabel} · ${date} · ${fmtTime(startIso)}–${fmtTime(endIso)}`;
}

// 저장 toast — 제목 + 보조(선택 ≠ 방문 고지). device-frame 안에서 뜨게.
function showSaveToast() {
  document.querySelector(".toast")?.remove();
  const toast = el("div", "toast toast--rich");
  toast.append(el("span", "toast-check", "✓"));
  const t = el("div", "toast-text");
  t.append(
    el("strong", null, "Saved to My Pick"),
    el("span", null, "Not a booking — check official details before you go."),
  );
  toast.append(t);
  (document.querySelector(".device-frame") || document.body).append(toast);
  setTimeout(() => toast.remove(), 2800);
}

function factRow(label, value, dataKo) {
  const row = el("div", "choice-fact");
  row.append(el("span", "choice-fact-k", label));
  if (value && value.chip) {
    const v = el("span", "choice-fact-v");
    v.append(el("span", "choice-fact-chip", value.chip));
    row.append(v);
  } else {
    const v = el("span", "choice-fact-v", value || "—");
    if (dataKo) v.dataset.ko = dataKo; // 🌐 번역 대상(한글 원문)일 때만
    row.append(v);
  }
  return row;
}

export function renderChoiceView({
  candidate,
  request,
  env,
  saved = false,
  onBack,
  onHome,
  onSeeMap,
  onFindOther,
  onBackToResults,
}) {
  const root = el("section", "view choice-page");
  const origin = env?.data?.origin;
  let isSaved = saved;

  function render() {
    root.replaceChildren();

    // Nav: Back(좌) · 제목 · Home(우)
    const nav = el("div", "input-nav");
    const back = el("button", "nav-back");
    back.type = "button";
    back.setAttribute("aria-label", "Back");
    back.innerHTML = CHEVRON;
    back.addEventListener("click", () => onBack?.());
    const home = el("button", "nav-home");
    home.type = "button";
    home.setAttribute("aria-label", "Home");
    home.append(icon3d("home", { size: 28 }));
    home.addEventListener("click", () => onHome?.());
    nav.append(
      back,
      el("span", "nav-title", isSaved ? "My Pick" : "Save to My Pick?"),
      home,
    );
    root.append(nav);

    const body = el("div", "choice-body");

    body.append(el("p", "choice-stamp", tripStamp(request.start_at, request.end_at)));
    const titleEl = el("h1", "choice-title", candidate.title);
    // 로마자화한 한글 제목이면 원문을 data-ko 로 → 상세 🌐 토글이 의미번역으로 교체(카드와 동일).
    if (candidate.title_original && HANGUL.test(candidate.title_original))
      titleEl.dataset.ko = candidate.title_original;
    body.append(titleEl);

    const badge = el("span", "badge", STATUS_LABEL[candidate.status] ?? candidate.status);
    badge.dataset.status = candidate.status;
    body.append(badge);

    // 번역 대상(로마자화한 한글 제목 또는 한글 가격 원문)이 있으면 상세에도 🌐 토글을 둔다 —
    // 상세는 가격 raw(예: '무료')를 그대로 보여주므로 번역 수요가 있다. 스코프=상세 root(모든 [data-ko]).
    const priceText =
      candidate.price?.raw || candidate.price?.display || "Price to check";
    if (titleEl.dataset.ko || HANGUL.test(priceText)) {
      const trRow = el("div", "choice-translate-row");
      trRow.append(createTranslateToggle(() => root));
      body.append(trRow);
    }

    if (candidate.reasons?.length) {
      const reasons = el("ul", "reasons");
      for (const r of candidate.reasons.slice(0, 2)) {
        const li = el("li", "reason");
        li.append(el("span", "reason-check", "✓"), el("span", null, r.text));
        reasons.append(li);
      }
      body.append(reasons);
    }

    // Fact 표 — Planned visit(소요) · Price · Getting there · Opening hours.
    // '세션(session)'이라는 표현은 쓰지 않는다 — 사용자의 시작시각을 '예약 회차'처럼 오인시키고,
    // 개관 전 시각(예: 07:58 < 09:30)을 '방문 가능 회차'로 보이게 한다(신뢰 §6). 사용자의 방문
    // 가능창은 상단 tripStamp 에, 실제 운영시간은 아래 'Opening hours' 행에 이미 분리 표시된다.
    const facts = el("div", "choice-facts");
    const visitMin = candidate.visit_minutes;
    facts.append(
      factRow("Planned visit", visitMin ? `About ${visitMin} min` : "Plan your own time"),
    );
    // 상세는 공간이 넉넉하니 카드용 축약(display) 대신 전체 공식 요금문(raw)을 보여준다
    // (카드는 짧게 '…'로 축약, 상세는 전액 요금표 그대로 — 줄바꿈). raw 없으면 display 폴백.
    // 한글이 섞인 원문(예: '무료')이면 data-ko 로 실어 🌐 번역 대상이 되게 한다.
    facts.append(
      factRow("Price", priceText, HANGUL.test(priceText) ? priceText : null),
    );
    if (candidate.movement?.display) {
      facts.append(
        factRow(
          "Getting there",
          origin?.label
            ? `${candidate.movement.display} from ${origin.label}`
            : candidate.movement.display,
        ),
      );
    }
    // 상세는 공간이 넉넉하니 요약(display) 없으면 원본 운영시간(raw) 전체를 보여준다(복수범위·
    // 계절도 그대로 — 카드엔 못 올리지만 상세에선 확인 가능). 둘 다 없으면 '확인 필요' 칩.
    const hoursVal = candidate.time?.display || candidate.time?.raw;
    facts.append(
      factRow("Opening hours", hoursVal || { chip: "Check opening hours" }),
    );
    body.append(facts);

    // 선택 ≠ 방문 고지 (저장 전/후 문구 구분).
    body.append(
      el(
        "p",
        "choice-note",
        isSaved
          ? "This is your saved choice — not a booking or visit record. Check official details before you go."
          : "Not saved yet. Save it to keep it as My Pick. Saving isn't a booking.",
      ),
    );

    // 버튼 (v3 issue #15 §2) — 순서:
    //   저장 전: Save to My Pick → Directions ↗ → Official website ↗ → Back to results
    //   저장 후: See on map    → Directions ↗ → Official website ↗ → Find other options
    // VISITKOREA 상세 링크는 여기서 숨긴다(상세는 결과 카드에서만) — kind 로 필터.
    const actions = el("div", "choice-actions");
    if (isSaved) {
      const map = el("button", "btn-cta", "See on map");
      map.type = "button";
      map.addEventListener("click", () => onSeeMap?.());
      actions.append(map);
    } else {
      const save = el("button", "btn-cta", "Save to My Pick");
      save.type = "button";
      save.addEventListener("click", () => {
        // 비회원이 저장 시도 → 로그인 유도(저장은 계정에 영속되므로). 로그인 후 다시 저장.
        if (!isLoggedIn()) {
          showLoginSheet({
            title: "Sign in to save to My Pick",
            subtitle:
              "Saving keeps this as My Pick across devices. Would you like to sign in now?",
          });
          return;
        }
        saveChoice(request, env, candidate.id); // 이제서야 저장(그 전엔 current choice 아님)
        isSaved = true;
        render();
        showSaveToast();
      });
      actions.append(save);
    }

    // Directions ↗ — 다른 버튼과 같은 흰 바탕·회색 테두리·검정 글자 + 앞 3D 목적지 아이콘(28).
    // 결과에서 Directions 를 누른 것과 동일하게 인앱 개요 지도 오버레이부터 보여준다(그 안에서
    // "Open in Naver Map" 으로 외부 연결). 좌표 없어 경로를 만들 수 없으면 숨긴다.
    if (directionsUrl(origin, candidate)) {
      const dir = el("button", "btn-outline-pill btn-outline-icon");
      dir.type = "button";
      dir.append(
        icon3d("destination", { size: 28, className: "btn-outline-ico" }),
        el("span", "btn-outline-text", "Directions ↗"),
      );
      dir.addEventListener("click", () => openDirectionsOverlay({ origin, candidate }));
      actions.append(dir);
    }

    // 공식 링크 — 시설 자체 공식 홈페이지만(VISITKOREA 상세는 kind 로 제외). 라벨은 백엔드 값.
    const officialLinks = (candidate.official_links ?? []).filter(
      (l) => l.kind !== "visitkorea",
    );
    if (officialLinks.length) {
      for (const link of officialLinks) {
        const offBtn = el("button", "btn-outline-pill", `${link.label} ↗`);
        offBtn.type = "button";
        offBtn.addEventListener("click", () =>
          window.open(link.url, "_blank", "noopener"),
        );
        actions.append(offBtn);
      }
    } else {
      const offBtn = el("button", "btn-outline-pill", "Official details ↗");
      offBtn.type = "button";
      offBtn.disabled = true;
      actions.append(offBtn);
    }

    // 마지막 내비 버튼은 조금 크게(16px Bold · 높이 50) — v3 §2 "Back to results 다른 버튼보다 크게".
    const third = el(
      "button",
      "btn-outline-pill btn-outline-lg",
      isSaved ? "Find other options" : "Back to results",
    );
    third.type = "button";
    third.addEventListener("click", () =>
      isSaved ? onFindOther?.() : onBackToResults?.(),
    );
    actions.append(third);

    body.append(actions);
    root.append(body);
  }

  render();
  return root;
}
