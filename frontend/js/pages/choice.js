// LF-09 · 선택 상세 (저장 전/후). 10/8 멘토링 "저장 동작 명확하게".
//  - 저장 전(9-1a/b/c): 제목 "Save to My Pick?", "Not saved yet", 버튼 "Save to My Pick".
//  - 저장 후(9-1·9-1s): 제목 "My Pick", 버튼 "See on map", toast "Saved to My Pick".
// 선택 ≠ 방문(booking 아님) 고지를 양쪽 모두 유지. 저장 전엔 My Pick으로 안 보인다.
import { isLoggedIn, saveChoice } from "../state.js";
import { showLoginSheet } from "../components/login-sheet.js";
import { icon3d } from "../components/icons3d.js";

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

function factRow(label, value) {
  const row = el("div", "choice-fact");
  row.append(el("span", "choice-fact-k", label));
  if (value && value.chip) {
    const v = el("span", "choice-fact-v");
    v.append(el("span", "choice-fact-chip", value.chip));
    row.append(v);
  } else {
    row.append(el("span", "choice-fact-v", value || "—"));
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
    body.append(el("h1", "choice-title", candidate.title));

    const badge = el("span", "badge", STATUS_LABEL[candidate.status] ?? candidate.status);
    badge.dataset.status = candidate.status;
    body.append(badge);

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
    facts.append(
      factRow(
        "Price",
        candidate.price?.raw || candidate.price?.display || "Price to check",
      ),
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
    facts.append(
      factRow(
        "Opening hours",
        candidate.time?.display
          ? candidate.time.display
          : { chip: "Check opening hours" },
      ),
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

    // 버튼 — 저장 전: Save to My Pick / Official details / Back to results.
    //        저장 후: See on map / Official details / Find other options.
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

    // 공식 링크 전부 제공(VISITKOREA 상세 + 시설 공식 홈페이지 등) — 라벨은 백엔드 값 그대로.
    const officialLinks = candidate.official_links ?? [];
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

    const third = el(
      "button",
      "btn-outline-pill",
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
