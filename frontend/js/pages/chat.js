// AG-4 · 단일 챗봇 — FAQ(RAG) · 즉시추천 · 문화루트를 하나의 대화 흐름으로.
// 자연어 → /api/chat(LLM tool-calling) → kind 별 렌더(answer/recommendation/route/clarify).
// 사실은 백엔드 코드 소유 — 여기서는 받은 fact 객체를 신뢰 분리해 '표시'만 한다.
import { postChat, getChatHistory, clearChatHistory } from "../api.js";
import { ready as authReady, isSignedIn } from "../auth.js";
import { openLocationSheet } from "../components/location-sheet.js";
import { openTimeSheet } from "../components/time-sheet.js";
import { openDateSheet } from "../components/date-sheet.js";
import { renderResultCard } from "../components/result-card.js";
import { renderRouteCard } from "../components/route-card.js";
import { renderMap, renderRouteMap } from "../map.js";
import { saveChoice, saveRoute } from "../state.js";
import { showLoginSheet } from "../components/login-sheet.js";
import { openSheet, el as sheetEl } from "../components/sheet.js";
import { icon3d } from "../components/icons3d.js";

const HOME_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>';
const CAL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function localValue(d) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

const SUGGESTIONS = [
  "Do I need to tip in Seoul?",
  "What can I do near me?",
  "Plan me a culture route for this afternoon",
];

// 에이전트가 생각하는 동안 보여줄 단계별 진행 문구(§6.9f). 실제 파이프라인 흐름을 반영하되
// 서버가 단계 이벤트를 스트리밍하진 않으므로 타이머로 순차 표시(끝 문구에서 멈춤).
const PROGRESS = [
  "Understanding your request…",
  "Searching official sources near you…",
  "Checking what's open and the details…",
  "Finding the best matches…",
  "Putting your results together…",
];
const PROGRESS_INTERVAL_MS = 1800;

export function renderChatView({ onBack, onHome }) {
  const root = el("section", "view chat");

  // ── Trip 맥락(추천·루트 tool 이 쓰는 사실). 기본 = 현재 위치·지금~+4h. 편집 가능. ──
  // 기본 종료 = 시작 + 4h, 단 '시작일 24:00까지'(백엔드 경계검증) → 같은 날 23:59로 clamp.
  function endForStart(startIso) {
    const s = new Date(startIso);
    const plus4 = new Date(s.getTime() + 4 * 3600 * 1000);
    const endOfDay = new Date(s);
    endOfDay.setHours(23, 59, 0, 0);
    return localValue(plus4 < endOfDay ? plus4 : endOfDay);
  }

  const now = new Date();
  now.setSeconds(0, 0);
  let locationLabel = "Current location";
  let geoCoords = null;
  let startValue = localValue(now);
  let endValue = endForStart(startValue);

  function tripContext() {
    const start_location = { label: locationLabel };
    if (geoCoords) Object.assign(start_location, geoCoords);
    return {
      start_location,
      start_at: `${startValue}:00`,
      end_at: `${endValue}:00`,
    };
  }

  // ── Header: 뒤로 + 타이틀 + 편집 가능한 Trip 칩(위치·시간) ──
  const header = el("div", "chat-header");
  const back = el("button", "icon-back", "←");
  back.type = "button";
  back.setAttribute("aria-label", "Back");
  if (onBack) back.addEventListener("click", onBack);
  const titleWrap = el("div", "chat-title-wrap");
  titleWrap.append(el("span", "chat-title", "KONNECT chat"));
  // 헤더 우측(옛 Clear 자리) → Home 버튼. 메인으로 이동(2026-10-14 재배치).
  const homeBtn = el("button", "chat-home");
  homeBtn.type = "button";
  homeBtn.setAttribute("aria-label", "Home");
  homeBtn.append(icon3d("home", { size: 28 }));
  homeBtn.addEventListener("click", () => (onHome || onBack)?.());
  header.append(back, titleWrap, homeBtn);
  root.append(header);

  // 상단 바 — 옛 'current location' 칩 자리에 Clear 버튼(대화 초기화, L4). 확인 후에만 삭제.
  const topBar = el("div", "chat-topbar");
  const clearBtn = el("button", "chat-clear", "Clear");
  clearBtn.type = "button";
  clearBtn.setAttribute("aria-label", "Clear chat");
  clearBtn.addEventListener("click", () => clearChat());
  topBar.append(clearBtn);
  root.append(topBar);

  // 필수 입력 3폼(날짜·위치·시간) — 하단 채팅 입력창 바로 위(root 끝에서 append).
  // 칩 = [📅 날짜] [📍 위치(긴 이름 … 생략)] [🕑 시작–종료]. 날짜 칩은 날짜 시트를 연다.
  const tripBar = el("div", "chat-trip");
  const dateChip = el("button", "trip-chip trip-chip--cal");
  dateChip.type = "button";
  const locChip = el("button", "trip-chip trip-chip--loc");
  locChip.type = "button";
  const locLabel = el("span", "trip-chip-label");
  locChip.append(el("span", "trip-chip-ico", "📍"), locLabel);
  const timeChip = el("button", "trip-chip");
  timeChip.type = "button";

  // "2–7 PM" 같은 컴팩트 범위. 분이 0이면 생략, 같은 오전/오후면 시작쪽 AM/PM 생략.
  const hhmm = (d) => {
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes();
    return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`;
  };
  const mer = (d) => (d.getHours() < 12 ? "AM" : "PM");
  function fmtRange(sIso, eIso) {
    const s = new Date(`${sIso}:00`);
    const e = new Date(`${eIso}:00`);
    const sTxt = mer(s) === mer(e) ? hhmm(s) : `${hhmm(s)} ${mer(s)}`;
    return `${sTxt}–${hhmm(e)} ${mer(e)}`;
  }
  function refreshTrip() {
    const d = new Date(`${startValue}:00`);
    const dateLabel = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dateChip.innerHTML = `${CAL_SVG}<span>${dateLabel}</span>`;
    // 위치는 7자 넘으면 '…'로 잘라 2줄 방지(예: "Namsang…").
    locLabel.textContent =
      locationLabel.length > 7 ? `${locationLabel.slice(0, 7).trimEnd()}…` : locationLabel;
    timeChip.textContent = `🕑 ${fmtRange(startValue, endValue)}`;
  }

  // 날짜 — 날짜 시트(Today/Tomorrow/This Sat/This Sun + 월 그리드). 시각은 유지, 날짜만 교체.
  dateChip.addEventListener("click", () =>
    openDateSheet({
      current: startValue.slice(0, 10),
      onPick: (ymd) => {
        startValue = `${ymd}T${startValue.slice(11, 16)}`;
        endValue = `${ymd}T${endValue.slice(11, 16)}`;
        refreshTrip();
      },
    }),
  );
  locChip.addEventListener("click", () =>
    openLocationSheet({
      currentLabel: locationLabel,
      onPick: (label, coords) => {
        locationLabel = label;
        geoCoords = coords;
        refreshTrip();
      },
    }),
  );
  const openEnd = () =>
    openTimeSheet({
      kind: "end",
      startValue,
      endValue,
      onDone: (v) => {
        endValue = v;
        refreshTrip();
      },
    });
  // 시간 칩 → 먼저 시작시간, Done 누르면 바로 'Done by'(종료) 시트로 이어진다(한 흐름).
  const openStart = () =>
    openTimeSheet({
      kind: "start",
      startValue,
      endValue,
      onDone: (v) => {
        startValue = v;
        if (new Date(`${endValue}:00`) <= new Date(`${v}:00`))
          endValue = endForStart(v); // 종료가 시작 이하가 되면 재설정
        refreshTrip();
        openEnd(); // 시작 확정 → 종료 시트로 자동 연결
      },
    });
  timeChip.addEventListener("click", openStart);
  // [주석 보존] "Plan a day" — 현재 미사용(2026-10-14). 이후 기능으로 재사용 가능해 코드만 유지.
  // const planDayBtn = el("button", "chat-planday", "Plan a day");
  // planDayBtn.addEventListener("click", () => {
  //   const d = new Date(`${startValue}:00`);
  //   d.setHours(21, 0, 0, 0);
  //   endValue = localValue(d);
  //   refreshTrip();
  //   send("Plan a culture route for the rest of today");
  // });
  refreshTrip();
  // [📍 위치] [📅 날짜] [🕑 시간] 순. tripBar 는 하단 입력창 바로 위에 append(아래).
  tripBar.append(locChip, dateChip, timeChip);

  // AI 관여 고지(1회, NFR-05)
  root.append(
    el(
      "p",
      "chat-ai-notice",
      "AI-assisted · facts come from official sources, unconfirmed details are marked.",
    ),
  );

  // ── 대화 로그 ──
  const log = el("div", "chat-log");
  root.append(log);

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function bubble(side, node) {
    const row = el("div", `chat-row chat-row--${side}`);
    const b = el("div", `chat-bubble chat-bubble--${side}`);
    if (typeof node === "string") b.textContent = node;
    else b.append(node);
    row.append(b);
    log.append(row);
    scrollDown();
    return row;
  }

  // 넓은 결과(카드·루트)는 버블 밖 전체폭 블록으로
  function assistantBlock(node) {
    const row = el("div", "chat-row chat-row--assistant");
    const block = el("div", "chat-block");
    block.append(node);
    row.append(block);
    log.append(row);
    scrollDown();
  }

  function renderAnswer(ans) {
    const wrap = el("div");
    wrap.append(el("p", "chat-answer-text", ans.answer));
    if (ans.citations?.length) {
      const cites = el("div", "chat-cites");
      cites.append(el("span", "chat-cites-label", "Sources:"));
      for (const c of ans.citations)
        cites.append(el("span", "chat-cite", c.source));
      wrap.append(cites);
    }
    bubble("assistant", wrap);
  }

  // 환경 주의(PRD §6.6) — 악천후/대기질 나쁨일 때만. Context일 뿐, 운영 사실 아님.
  function envNotice(env) {
    if (!env?.adverse || !env.advisory) return;
    const n = el("div", "chat-weather");
    const glyph =
      env.precipitation === "snow"
        ? "❄️"
        : env.precipitation === "none"
          ? "😷"
          : "🌧";
    n.append(el("span", "chat-weather-icon", glyph), el("span", null, env.advisory));
    assistantBlock(n);
  }

  function renderRecommendation(data) {
    envNotice(data.environment);
    const cands = data.candidates ?? [];
    if (!cands.length) {
      bubble(
        "assistant",
        "I couldn't find experiences that fit those conditions right now. Try a different time or area.",
      );
      return;
    }
    // 소개 문구는 renderResponse 가 AI 생성 message 로 이미 냈다(하드코딩 제거).
    for (const n of data.notices ?? []) bubble("assistant", n);
    // 지도: 출발점 + 후보 핀. 카드보다 먼저.
    const mapEl = el("div", "chat-map");
    assistantBlock(mapEl);
    const list = el("div", "chat-cards");
    const cardById = {};
    // 챗에서 추천 A 기능을 쓴 결과도 저장 가능 — 각 카드의 'Select' 를 rec A 처럼 저장에 연결.
    function selectPick(cand) {
      if (!isSignedIn()) {
        showLoginSheet({
          title: "Sign in to save to My Pick",
          subtitle:
            "Saving keeps this as My Pick across devices. Would you like to sign in now?",
        });
        return;
      }
      saveChoice(tripContext(), { ok: true, data }, cand.id);
      for (const [cid, card] of Object.entries(cardById)) {
        const b = card.querySelector(".btn-select");
        const isSel = cid === cand.id;
        card.classList.toggle("is-choice", isSel);
        if (b) b.textContent = isSel ? "Saved ✓" : "Select";
      }
      bubble(
        "assistant",
        `Saved “${cand.title}” to My Pick — find it on Home or My Page.`,
      );
    }
    cands.forEach((c, i) => {
      const card = renderResultCard(c, data.origin, i);
      card.dataset.id = c.id;
      cardById[c.id] = card;
      const selBtn = card.querySelector(".btn-select");
      if (selBtn)
        selBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // 카드 포커스(지도)로 버블링 막고 저장만
          selectPick(c);
        });
      list.append(card);
    });
    assistantBlock(list);
    // 지도-카드 포커스 연결(추천 A처럼): 카드/핀 선택 → 그 후보의 Tmap 경로선 표시·전환.
    renderMap(mapEl, data.origin, cands)
      .then((ctrl) => {
        if (!ctrl) return;
        const focus = (id) => {
          for (const [cid, card] of Object.entries(cardById))
            card.classList.toggle("is-focused", cid === id);
          ctrl.focus(id); // 해당 후보의 실제 경로선 draw(없으면 핀만)
        };
        for (const c of cands)
          cardById[c.id].addEventListener("click", () => focus(c.id));
        ctrl.onPinClick(focus);
        // 초기엔 첫 후보의 경로선만 지도에 그리고, 카드 아웃라인(.is-focused)은 넣지 않는다 —
        // 안 그러면 특히 'recommend one'(결과 1개)에서 첫 카드가 자동 선택된 것처럼 보인다.
        ctrl.focus(cands[0].id);
      })
      .catch(() => mapEl.remove());
  }

  function renderRoute(data) {
    envNotice(data.environment);
    const routes = data.routes ?? [];
    if (!routes.length) {
      bubble(
        "assistant",
        data.unmet ||
          "I couldn't build a reliable route right now. Try a longer time window.",
      );
      return;
    }
    // 소개 문구는 renderResponse 가 AI 생성 message 로 이미 냈다(하드코딩 제거).
    for (const r of routes) {
      const mapEl = el("div", "chat-map");
      assistantBlock(mapEl);
      renderRouteMap(mapEl, data.origin, r).catch(() => mapEl.remove());
      assistantBlock(
        renderRouteCard(r, data.origin, {
          trip: { start_at: `${startValue}:00`, end_at: `${endValue}:00` },
          onRemove: (title) => send(`Remove ${title} from the route`),
        }),
      );
      assistantBlock(routeSaveBar(r, data.origin));
    }
  }

  // "Go with this route"(구 "Save this route") — 로그인 사용자만(DB 영속). 참조(스톱 제목·origin·시간창)만 저장하고
  // 열 때 라이브 재조립(캐싱 금지 준수). 선택 ≠ 방문 — 예약/방문 확정이 아님을 문구로 유지.
  function routeSaveBar(route, origin) {
    const bar = el("div", "route-save-bar");
    const btn = el("button", "btn-save-route", "Go with this route");
    btn.type = "button";
    const note = el("p", "route-save-note", "Saving ≠ booking. We'll show it on your home & My Page.");
    btn.addEventListener("click", async () => {
      // 비회원이 저장 시도 → 로그인 유도(DB 영속). 로그인 후 다시 저장.
      if (!isSignedIn()) {
        showLoginSheet({
          title: "Sign in to save to My Route",
          subtitle:
            "Saving keeps this as My Route on your home & My Page. Would you like to sign in now?",
        });
        return;
      }
      btn.disabled = true;
      btn.textContent = "Saving…";
      const ok = await saveRoute({
        stops: route.stops.map((s) => s.candidate.title),
        origin,
        // 시작/종료는 'HH:MM' 시계시각만 저장(startValue 는 "YYYY-MM-DDTHH:MM" 형식) — 재조립이
        // 오늘 날짜에 이 시각을 붙여 ISO 로 만든다. 날짜까지 넣으면 start_at 이 깨져 재조립 실패.
        start_hm: startValue.slice(11, 16),
        end_hm: endValue.slice(11, 16),
      });
      btn.textContent = ok ? "Saved ✓" : "Couldn't save — try again";
      if (!ok) btn.disabled = false;
    });
    bar.append(btn, note);
    return bar;
  }

  // 어시스턴트 턴을 짧은 텍스트로 요약(멀티턴 맥락 — LLM 이 후속 교정을 이해하도록).
  function summarize(data) {
    // 멀티의도: 실린 결과를 모두 요약(히스토리 맥락 정확). 없으면 message.
    const parts = [];
    if (data.route) {
      const r = (data.route.routes ?? [])[0];
      parts.push(
        r
          ? `Planned a route "${r.name}": ${r.stops
              .map((s) => s.candidate.title)
              .join(" → ")}`
          : data.route.unmet || "No route available.",
      );
    }
    if (data.recommendation) {
      const t = (data.recommendation.candidates ?? []).map((c) => c.title);
      parts.push(
        t.length
          ? `Suggested experiences: ${t.join(", ")}`
          : "No experiences fit those conditions.",
      );
    }
    if (data.answer && data.answer.answer) parts.push(data.answer.answer);
    return parts.join("\n") || data.message || "";
  }

  function renderResponse(data) {
    // AI가 생성한 자연어 답변(message)을 결과 '소개'로 사용 — 하드코딩 문구 대체.
    const intro = (data.message || "").trim();
    const hasRoute = data.route && (data.route.routes ?? []).length;
    const hasRec = data.recommendation && (data.recommendation.candidates ?? []).length;
    if (intro && (hasRoute || hasRec)) bubble("assistant", intro);
    // 멀티의도: 실린 결과를 모두 렌더(route→recommendation→answer). 한 종류만 그리지 않는다.
    let rendered = false;
    if (hasRoute) {
      renderRoute(data.route);
      rendered = true;
    }
    if (data.recommendation) {
      renderRecommendation(data.recommendation);
      rendered = true;
    }
    if (data.answer && data.answer.answer) {
      renderAnswer(data.answer);
      rendered = true;
    }
    // 아무 결과도 없으면(clarify/빈 결과) AI 텍스트 또는 되묻기
    if (!rendered) {
      bubble(
        "assistant",
        intro || "Could you tell me a bit more about what you'd like?",
      );
    }
  }

  // ── 입력 바 ──
  const inputBar = el("div", "chat-input-bar");
  const ta = el("textarea", "chat-textarea");
  ta.rows = 1;
  ta.placeholder = "Ask a question, or what you'd like to do…";
  const sendBtn = el("button", "chat-send");
  sendBtn.type = "button";
  sendBtn.setAttribute("aria-label", "Send");
  sendBtn.textContent = "↑";
  inputBar.append(ta, sendBtn);

  // 첫 화면 제안 칩(첫 전송 전까지)
  const suggest = el("div", "chat-suggest");
  for (const s of SUGGESTIONS) {
    const chip = el("button", "chat-suggest-chip", s);
    chip.type = "button";
    chip.addEventListener("click", () => send(s));
    suggest.append(chip);
  }
  log.append(suggest);

  // 응답 대기 중 '진행 문구가 순환하는' 어시스턴트 버블. 끝 문구에서 멈추고, stop() 로 정리.
  function thinkingBubble() {
    const span = el("span", "chat-typing", PROGRESS[0]);
    const node = bubble("assistant", span);
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(i + 1, PROGRESS.length - 1);
      span.textContent = PROGRESS[i];
    }, PROGRESS_INTERVAL_MS);
    return { node, stop: () => clearInterval(timer) };
  }

  const history = []; // 멀티턴 맥락(AG-3) — 서버는 stateless, 매 턴 함께 전송
  let busy = false;
  async function send(text) {
    const msg = (text ?? ta.value).trim();
    if (!msg || busy) return;
    busy = true;
    suggest.remove();
    ta.value = "";
    ta.style.height = "auto";
    bubble("user", msg);

    const prior = history.slice(); // 이번 사용자 메시지 '이전'까지의 맥락
    history.push({ role: "user", content: msg });

    const thinking = thinkingBubble();
    try {
      const env = await postChat(msg, tripContext(), prior);
      thinking.stop();
      thinking.node.remove();
      if (!env.ok) {
        const m =
          env.error?.message || "Sorry, something went wrong. Please try again.";
        bubble("assistant", m);
        history.push({ role: "assistant", content: m });
      } else {
        renderResponse(env.data);
        // 맥락 요약은 백엔드가 내려준 값(영속 저장과 동일) 우선, 없으면 로컬 fallback.
        history.push({
          role: "assistant",
          content: env.data.history_summary || summarize(env.data),
        });
      }
    } catch {
      const m = "I couldn't reach the service. Please try again.";
      thinking.stop();
      thinking.node.remove();
      bubble("assistant", m);
      history.push({ role: "assistant", content: m });
    } finally {
      busy = false;
    }
  }

  sendBtn.addEventListener("click", () => send());
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  });

  // 여러 줄 맥락 요약(assistant)을 줄바꿈 보존해 버블로. 복구 트랜스크립트용.
  function multiline(text) {
    const wrap = el("div");
    (text || "").split("\n").forEach((line, i) => {
      if (i) wrap.append(el("br"));
      wrap.append(document.createTextNode(line));
    });
    return wrap;
  }

  // Clear chat(L4) — '정말 지우시겠습니까?' 확인 시트 → Yes 일 때만 로컬 로그·맥락 비우고,
  // 로그인 사용자면 저장 대화도 삭제(graceful).
  function clearChat() {
    if (busy) return;
    if (!history.length && !log.querySelector(".chat-row")) return;
    openSheet((close) => {
      const c = sheetEl("div", "reset-confirm");
      c.append(
        sheetEl("h2", "sheet-title", "Clear this conversation?"),
        sheetEl("p", "sheet-sub", "This removes the whole chat. It can't be undone."),
      );
      const yes = sheetEl("button", "btn-cta", "Yes, clear");
      yes.type = "button";
      yes.addEventListener("click", async () => {
        history.length = 0;
        log.replaceChildren(suggest); // 로그 비우고 첫 화면 제안 복원
        close();
        try {
          await clearChatHistory(); // 익명/비로그인은 서버 no-op — 실패해도 로컬은 이미 정리.
        } catch {
          /* 저장 삭제 실패가 로컬 초기화를 막지 않게 */
        }
      });
      const no = sheetEl("button", "sheet-dismiss", "Keep it");
      no.type = "button";
      no.addEventListener("click", close);
      c.append(yes, no);
      return c;
    });
  }

  // 재진입 복구(L4) — 정식 로그인 사용자의 전체 누적 대화를 트랜스크립트로 재생 +
  // 멀티턴 맥락(history) 시드. 사실 카드가 아니라 '대화 기록'을 그린다(오래된 사실을
  // 현재처럼 재렌더하지 않음 — 새 결과가 필요하면 다시 물으면 라이브 재조회).
  (async () => {
    await authReady();
    if (!isSignedIn()) return;
    let env;
    try {
      env = await getChatHistory();
    } catch {
      return; // 복구 실패는 조용히 — 빈 대화로 시작(graceful).
    }
    const turns = env?.ok ? env.data?.turns ?? [] : [];
    if (!turns.length) return;
    suggest.remove(); // 과거 대화가 있으면 첫 화면 제안 숨김
    for (const t of turns) {
      history.push({ role: t.role, content: t.content });
      if (t.role === "user") bubble("user", t.content);
      else bubble("assistant", multiline(t.content));
    }
    scrollDown();
  })();

  // 필수 입력 3폼 → 입력창 바로 위(구분선 아래). 그 아래 입력 바.
  root.append(tripBar);
  root.append(inputBar);
  return root;
}
