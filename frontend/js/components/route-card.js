// Route Card (LF-05/08) — 하루 1코스를 '따로따로'가 아닌 하나의 코스로.
// 헤드라인·날짜/시간 → WHY THIS ROUTE(루트 상태) → 확인필요 요약 → 범례 →
// 타임라인(Start→구간→스톱, 스톱별 이유·사실·Remove) → 종료 → 총계.
// 체류시간은 주장하지 않는다(B-T01) — 각 스톱 '예정 분'은 표기 안 함.
import { farChip } from "./result-card.js";
import { typeIcon3d, TYPE_LABEL_3D, icon3d } from "./icons3d.js";
import { createTranslateToggle } from "./translate-toggle.js";

// 한글 포함 여부 — 번역 토글 대상(스톱 제목·가격). 원문 한글을 data-ko 에 실어둔다.
const HANGUL = /[가-힣]/;

const ROUTE_STATUS = {
  fits: "Ready to go (route)",
  check_needed: "Partially confirmed (route)",
  alternative: "Alternative route",
};

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function segmentRow(seg) {
  // 걷는 구간 — 세로선은 진한 청록(CSS). 이동 글자는 청록 13 SemiBold(이모지 없이).
  const row = el("div", "route-seg");
  const parts = [];
  if (seg.movement?.display) parts.push(seg.movement.display);
  if (seg.movement?.distance_m)
    parts.push(`${(seg.movement.distance_m / 1000).toFixed(seg.movement.distance_m >= 1000 ? 1 : 2)} km`);
  row.append(el("span", "route-seg-text", parts.join(" · ")));
  return row;
}

// 계획 방문시간 배지 — 10/8: "Official" 태그 제거(확인된 건 그대로 보이면 됨).
// 계획값(유형기준)만 "Planned"로 구분 유지. confirmed(공식 spendtime)면 배지 없음.
function visitBadge(prov) {
  if (prov === "confirmed") return null;
  const b = el("span", "route-visit-badge", "Planned");
  b.dataset.prov = prov;
  return b;
}

function stopRow(stop, onRemove) {
  const c = stop.candidate;
  const row = el("div", "route-stop");
  row.dataset.status = c.status;

  const num = el("span", "route-stop-num", String(stop.order));
  const body = el("div", "route-stop-body");

  const titleLine = el("div", "route-stop-title-line");
  const stopTitle = el("span", "route-stop-title", c.title);
  if (c.title_original && HANGUL.test(c.title_original))
    stopTitle.dataset.ko = c.title_original;
  titleLine.append(stopTitle);
  // 유형 태그 — 3D 유형 아이콘 24 + 유형 이름(Figma v2, 상태 배지 대신). 분류 근거(signals)가
  // 있으면 태그를 눌러 AI 분류 매칭 칩을 펼친다(기존 투명 UX 유지). 미확인 구분은 flags·Planned 로.
  const hasSignals = Array.isArray(c.signals) && c.signals.length > 0;
  const typeTag = el(hasSignals ? "button" : "span", "route-stop-type");
  if (hasSignals) typeTag.type = "button";
  typeTag.append(
    typeIcon3d(c.type, { size: 24 }),
    el("span", "route-stop-type-label", TYPE_LABEL_3D[c.type] || "Place"),
  );
  titleLine.append(typeTag);
  const far = farChip(c); // 반경 확대로 편입된 스톱 → 분홍 "Far" 칩
  if (far) titleLine.append(far);
  body.append(titleLine);

  // 유형 태그 펼침 패널 — AI 분류 매칭 칩(표시 전용). 기본 접힘. ✦ AI 패널은 고지만 남긴다.
  if (hasSignals) {
    typeTag.classList.add("is-toggle");
    typeTag.setAttribute("aria-expanded", "false");
    typeTag.setAttribute("aria-label", "Show AI classification keywords");
    const sigPanel = el("div", "card-signals");
    sigPanel.hidden = true;
    const chips = el("div", "signals");
    for (const s of c.signals) {
      const chip = el("span", "signal", s.label);
      if (s.matched) chip.classList.add("is-matched");
      chips.append(chip);
    }
    sigPanel.append(chips);
    body.append(sigPanel);
    typeTag.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = sigPanel.hidden;
      sigPanel.hidden = !open;
      typeTag.setAttribute("aria-expanded", String(open));
      typeTag.classList.toggle("is-open", open);
    });
  }

  // 스톱별 이유(코스 "왜 이 장소") — teal check, 0개면 생략
  if (c.reasons?.length) {
    const rs = el("ul", "route-stop-reasons");
    for (const r of c.reasons.slice(0, 2)) {
      const li = el("li", "reason");
      li.append(el("span", "reason-check", "✓"), el("span", null, r.text));
      rs.append(li);
    }
    body.append(rs);
  }

  // 계획 방문시간 — 공식 spendtime=Official / 유형기준=Planned (B-T01). 도보 미확인이면
  // 절대 window 없이 소요분만. 공연·예약형 체험에 공식 러닝타임이 없으면(unconfirmed) 숫자를
  // 주장하지 않고 '확인 필요'로 안내. 운영시간(fact)과 별개로 분리 표기.
  if (stop.visit_minutes) {
    const when = el("div", "route-stop-when");
    if (stop.visit_provenance === "unconfirmed") {
      when.append(
        el("span", "route-stop-time route-stop-time--check", "Check visit time"),
      );
    } else {
      const label =
        stop.arrival_at && stop.depart_at
          ? `${fmtTime(stop.arrival_at)} – ${fmtTime(stop.depart_at)}`
          : `≈${stop.visit_minutes} min visit`;
      when.append(el("span", "route-stop-time", label));
      const vb = visitBadge(stop.visit_provenance);
      if (vb) when.append(vb);
    }
    body.append(when);
  }

  // Fact: 운영시간·가격(미확인 가격은 flag로 분리)
  const meta = el("div", "route-stop-meta");
  if (c.time) meta.append(el("span", "meta-item", c.time.display));
  if (c.price && c.price.status !== "unknown") {
    const priceEl = el("span", "meta-item", c.price.display);
    const ko = c.price.raw || c.price.display;
    if (ko && HANGUL.test(ko)) priceEl.dataset.ko = ko;
    meta.append(priceEl);
  }
  if (meta.childNodes.length) body.append(meta);

  if (c.flags?.length) {
    const flags = el("div", "flags");
    for (const f of c.flags) flags.append(el("span", "flag", f.text));
    body.append(flags);
  }

  const actions = el("div", "route-stop-actions");
  for (const link of c.official_links ?? []) {
    const a = el("a", "official-link", `${link.label} ↗`);
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener";
    actions.append(a);
  }
  if (onRemove) {
    const rm = el("button", "route-remove", "Remove");
    rm.type = "button";
    rm.addEventListener("click", () => onRemove(c.title));
    actions.append(rm);
  }
  if (actions.childNodes.length) body.append(actions);

  row.append(num, body);
  return row;
}

export function renderRouteCard(route, origin, opts = {}) {
  const { trip, onRemove } = opts;
  const card = el("article", "route-card");

  // ── Head: (번역 토글) + 날짜/시간 + 헤드라인 + 스톱 요약 ──
  const head = el("div", "route-card-head");
  // 결과 상단 Translate — 스톱 제목·가격의 한글 원문을 온디맨드 의미번역(기본은 결정론 표시).
  const trRow = el("div", "route-translate-row");
  trRow.append(createTranslateToggle(() => card));
  head.append(trRow);
  if (trip?.start_at && trip?.end_at)
    head.append(
      el(
        "p",
        "route-when",
        `${fmtDate(trip.start_at)} · ${fmtTime(trip.start_at)}–${fmtTime(trip.end_at)}`,
      ),
    );
  head.append(el("h2", "route-card-name", route.headline || route.name));
  const stopNames = route.stops.map((s) => s.candidate.title).join(" · ");
  head.append(el("p", "route-stop-summary", stopNames));
  card.append(head);

  // ✦ AI 배지(요약 아래) — 탭하면 'AI로 산출된 결과'라는 고지만(rec A 와 동일, 2026-10-14).
  // 스톱별 분류 매칭 칩은 각 스톱의 등급 라벨을 눌러 확인한다(stopRow).
  const sigStops = route.stops.filter((s) => s.candidate?.signals?.length);
  if (sigStops.length) {
    const aiWrap = el("div", "route-ai");
    const aiBtn = el("button", "ai-badge");
    aiBtn.type = "button";
    aiBtn.innerHTML = '<span class="ai-badge-spark" aria-hidden="true">✦</span> AI';
    aiBtn.setAttribute("aria-expanded", "false");
    aiBtn.setAttribute("aria-label", "About this AI route");
    const panel = el("div", "ai-panel");
    panel.hidden = true;
    panel.append(
      el("p", "ai-panel-note", "AI-assisted · details may change as info updates"),
    );
    aiBtn.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      aiBtn.setAttribute("aria-expanded", String(open));
      aiBtn.classList.toggle("is-active", open);
    });
    aiWrap.append(aiBtn, panel);
    card.append(aiWrap);
  }

  // ── WHY THIS ROUTE + 루트 상태 ──
  const why = el("div", "route-why");
  why.append(el("p", "route-why-label", "WHY THIS ROUTE"));
  const whyReason = el("p", "route-why-reason");
  whyReason.append(
    el("span", "reason-check", "✓"),
    el("span", null, "Planned to fit your time window"),
  );
  why.append(whyReason);
  const rstatus = el("span", "route-status", ROUTE_STATUS[route.status] ?? "Culture route");
  rstatus.dataset.status = route.status;
  why.append(rstatus);
  card.append(why);

  // ── 가기 전 확인할 것(집계) ──
  if (route.checks?.length) {
    const check = el("div", "route-check");
    check.append(
      el(
        "p",
        "route-check-title",
        `${route.checks.length} thing${route.checks.length > 1 ? "s" : ""} to check before you go`,
      ),
    );
    const ul = el("ul", "route-check-list");
    for (const c of route.checks) ul.append(el("li", null, c));
    check.append(ul);
    card.append(check);
  }

  // ── 범례 ──
  const legend = el("div", "route-legend");
  for (const [cls, label] of [
    ["lg-estimate", "≈ Estimated"],
    ["lg-planned", "Planned"],
    ["lg-check", "To check"],
  ])
    legend.append(el("span", `route-legend-item ${cls}`, label));
  card.append(legend);

  // ── 타임라인: Start → (seg) → stop1 … ──
  const timeline = el("div", "route-timeline");
  // 출발 — 남색 점 + 왼쪽 3D 걷는 사람(36). 세로선은 점 아래에서 시작(Figma v2).
  const startRow = el("div", "route-start");
  startRow.append(
    icon3d("walking", { size: 36, className: "route-start-walker" }),
    el("span", "route-start-dot"),
    el("span", "route-start-label", `Start · ${origin?.label ?? "Your start"}`),
  );
  if (trip?.start_at)
    startRow.append(el("span", "route-start-time", fmtTime(trip.start_at)));
  timeline.append(startRow);
  route.stops.forEach((stop, i) => {
    if (route.segments?.[i]) timeline.append(segmentRow(route.segments[i]));
    timeline.append(stopRow(stop, onRemove));
  });
  // End — 계획 종료(도보+방문 체인). finish_at 있으면 그 값, 없으면 창 종료.
  const finish = route.finish_at || trip?.end_at || null;
  const endRow = el("div", "route-end");
  endRow.append(el("span", "route-end-flag", "⚑"));
  endRow.append(
    el(
      "span",
      "route-end-label",
      finish
        ? `${route.finish_at ? "Finish about" : "Finish by"} ${fmtTime(finish)}`
        : "End · your plan",
    ),
  );
  timeline.append(endRow);
  card.append(timeline);

  // ── 총계(비용·도보·종료) ──
  const totals = el("div", "route-totals");
  const addTotal = (k, v) => {
    const r = el("div", "route-total-row");
    r.append(el("span", "route-total-k", k), el("span", "route-total-v", v));
    totals.append(r);
  };
  addTotal("Total cost", route.budget_note || "See each stop");
  if (route.total_walk_minutes != null)
    addTotal("Walking", `≈${route.total_walk_minutes} min in total`);
  if (finish)
    addTotal("Finish", `${route.finish_at ? "≈" : "by "}${fmtTime(finish)}`);
  card.append(totals);

  if (route.flags?.length) {
    const flags = el("div", "flags");
    for (const f of route.flags) flags.append(el("span", "flag", f.text));
    card.append(flags);
  }
  // 체류시간 미주장(B-T01) 안내
  if (route.stay_note) card.append(el("p", "route-stay-note", route.stay_note));
  return card;
}
