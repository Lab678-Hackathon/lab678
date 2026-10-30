// MP-1~3 · My Page (Phase 2 L3 · FR-L6). 10/8 MP-1b/2c 디자인 반영.
//  - 계정(아바타 + 이름) · 현재 선택 진입(또는 빈 상태) · 선호 확인/수정/초기화
//  - 하단 Sign out. 선호 변경은 **이후 추천부터** 적용. 저장은 PUT /api/preferences.
import { displayName, signOut } from "../auth.js";
import { getPreferences, putPreferences } from "../api.js";
import { createPreferenceForm, INTERESTS } from "../components/preference-form.js";
import { openPrefConfirm } from "../components/pref-confirm.js";
import { openSheet, el as sheetEl } from "../components/sheet.js";
import { loadChoice, loadRoute } from "../state.js";
import { icon3d } from "../components/icons3d.js";

const LABEL = Object.fromEntries(INTERESTS); // code → 표시 라벨
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

export function renderMyPageView({ onBack, onHome, onViewPick, onViewRoute } = {}) {
  const root = el("section", "mypage");

  // Nav — chevron Back · My Page · Home(우상단).
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
  nav.append(back, el("span", "nav-title", "My Page"), home);
  root.append(nav);

  const body = el("div", "mypage-body");
  root.append(body);

  let prefs = null; // { interests, prefer_shorter_walks, open_preferences }
  let mode = "view"; // view | edit

  // 계정 — 아바타(이니셜) + 이름 + "Signed in with Google".
  function renderAccount() {
    const s = el("div", "mypage-account");
    const name = displayName();
    const avatar = el(
      "div",
      "mypage-avatar",
      name ? name.trim()[0].toUpperCase() : "👤",
    );
    const text = el("div", "mypage-account-text");
    text.append(
      el("span", "mypage-account-name", name || "Signed in"),
      el("span", "mypage-account-sub", "Signed in with Google"),
    );
    s.append(avatar, text);
    return s;
  }

  // 저장 결과 바로가기 — "My Pick"(저장 추천 A) · "My Route"(저장 추천 B) 동일 디자인 버튼.
  // 누르면 최초 추천과 같은 톤(지도 + 결과)으로 렌더. 사실·경로선은 저장 안 하고 열 때 라이브
  // 재조회(캐시 금지 규약 준수) — My Pick 은 저장된 request/env 로 결과 뷰, My Route 는 라이브 재조립.
  function savedButton({ title, sub, enabled, loading, onClick }) {
    const btn = el("button", "mypage-cc");
    btn.type = "button";
    const texts = el("div", "mypage-cc-texts");
    texts.append(el("span", "mypage-cc-title", title));
    const subEl = el("span", "mypage-cc-sub", sub);
    texts.append(subEl);
    btn.append(texts);
    if (enabled) {
      btn.classList.add("has-choice");
      btn.append(el("span", "mypage-cc-arrow", loading ? "…" : "→"));
      btn.disabled = !!loading;
      btn.addEventListener("click", onClick);
    } else {
      subEl.classList.add("is-empty");
      btn.disabled = true;
    }
    return btn;
  }

  function renderPickButton() {
    const saved = loadChoice();
    const cand = saved?.env?.data?.candidates?.find(
      (c) => c.id === saved.candidateId,
    );
    return savedButton({
      title: "My Pick",
      sub: cand ? cand.title : "Nothing saved yet",
      enabled: !!cand,
      onClick: () => onViewPick?.(),
    });
  }

  // My Route 버튼 — 저장 ref 존재 여부를 비동기 확인(DB)해 활성화. 누르면 ref 를 넘겨
  // showSavedRoute 가 스플래시 전환 + 라이브 재조립을 처리(여기선 무거운 조회를 하지 않는다).
  let routeChecked = false;
  let savedRouteRef = null;
  const routeSlot = el("div", "mypage-route-slot");
  function paintRouteButton() {
    const hasRoute = !!savedRouteRef?.stops?.length;
    const sub = !routeChecked
      ? "Checking…"
      : hasRoute
        ? (savedRouteRef.stops || []).join(" → ")
        : "Nothing saved yet";
    routeSlot.replaceChildren(
      savedButton({
        title: "My Route",
        sub,
        enabled: routeChecked && hasRoute,
        onClick: () => onViewRoute?.(savedRouteRef),
      }),
    );
  }
  function renderRouteButton() {
    if (!routeChecked) {
      loadRoute().then((ref) => {
        routeChecked = true;
        savedRouteRef = ref;
        paintRouteButton();
      });
    }
    paintRouteButton();
    return routeSlot;
  }

  function renderSavedButtons() {
    const wrap = el("div", "mypage-saved");
    wrap.append(renderPickButton(), renderRouteButton());
    return wrap;
  }

  // 선호 보기 — 관심사 칩 + "Also" 추가선호 + Edit/Add·Reset 링크(MP-1b).
  function renderPreferencesView() {
    const s = el("div", "mypage-prefs");
    const list = prefs?.interests ?? [];
    const extras = [...(prefs?.open_preferences ?? [])];
    if (prefs?.prefer_shorter_walks === true) extras.push("Shorter walks");
    else if (prefs?.prefer_shorter_walks === false) extras.push("Happy to walk");
    const hasAny = list.length || extras.length;

    const head = el("div", "mypage-prefs-head");
    head.append(el("h2", "mypage-prefs-title", "Your preferences"));
    const edit = el("button", "mypage-link", hasAny ? "Edit" : "Add");
    edit.type = "button";
    edit.addEventListener("click", () => {
      mode = "edit";
      render();
    });
    head.append(edit);
    s.append(head);
    s.append(
      el(
        "p",
        "mypage-prefs-sub",
        "Used for future suggestions. Your current request always comes first.",
      ),
    );

    if (list.length) {
      const chips = el("div", "mypage-pref-chips");
      for (const code of list)
        chips.append(el("span", "parsed-chip", LABEL[code] || code));
      s.append(chips);
    }
    if (extras.length) {
      s.append(el("p", "mypage-pref-also", "Also"));
      s.append(el("p", "mypage-pref-also-list", extras.join(" · ")));
    }
    if (!hasAny) s.append(el("p", "mypage-pref-empty", "Nothing saved yet"));

    if (hasAny) {
      const reset = el("button", "mypage-link mypage-link--danger", "Reset preferences");
      reset.type = "button";
      reset.addEventListener("click", confirmReset);
      s.append(reset);
    }
    return s;
  }

  // 선호 수정 — 관심사 + 자유입력(인라인 해석 없음). Save 시 확인 모달에서 해석 결과를
  // 보여주고(Also × 제거 가능) 저장한다(온보딩과 동일 UX, 화면에 인라인 박스를 띄우지 않음).
  function renderPreferencesEdit() {
    const s = el("div", "mypage-prefs");
    s.append(el("h2", "mypage-prefs-title", "Your preferences"));
    const form = createPreferenceForm({
      interests: prefs?.interests ?? [],
      preferShorterWalks: prefs?.prefer_shorter_walks ?? null, // tri-state 보존
      openPreferences: prefs?.open_preferences ?? [],
      autoParse: false,
    });
    s.append(form.element);

    const actions = el("div", "mypage-pref-actions");
    const save = el("button", "btn-cta", "Save");
    save.type = "button";
    save.addEventListener("click", () =>
      openPrefConfirm({
        form,
        confirmLabel: "Save",
        onConfirm: async (values) => {
          const env = await putPreferences(values).catch(() => null);
          if (env?.ok && env.data) prefs = env.data;
          mode = "view";
          render();
        },
      }),
    );
    const cancel = el("button", "sheet-dismiss", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      mode = "view";
      render();
    });
    actions.append(save, cancel);
    s.append(actions);
    return s;
  }

  // 초기화 확인 시트 → 빈 PUT(관심사 [] · 걷기 null · 개방형 []).
  function confirmReset() {
    openSheet((close) => {
      const c = sheetEl("div", "reset-confirm");
      c.append(
        sheetEl("h2", "sheet-title", "Reset preferences?"),
        sheetEl(
          "p",
          "sheet-sub",
          "This clears your saved interests and extra preferences. It won't change your current recommendations.",
        ),
      );
      const confirm = sheetEl("button", "btn-cta", "Reset");
      confirm.type = "button";
      confirm.addEventListener("click", async () => {
        confirm.disabled = true;
        confirm.textContent = "Resetting…";
        const env = await putPreferences({
          interests: [],
          prefer_shorter_walks: null,
          open_preferences: [],
        }).catch(() => null);
        if (env?.ok && env.data) prefs = env.data;
        close();
        mode = "view";
        render();
      });
      const keep = sheetEl("button", "sheet-dismiss", "Keep them");
      keep.type = "button";
      keep.addEventListener("click", close);
      c.append(confirm, keep);
      return c;
    });
  }

  function renderSignOut() {
    const btn = el("button", "mypage-signout", "Sign out");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Signing out…";
      try {
        await signOut();
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Sign out";
        console.warn("sign-out failed:", e?.message || e);
      }
    });
    return btn;
  }

  function render() {
    body.replaceChildren();
    body.append(renderAccount());
    body.append(renderSavedButtons());
    body.append(mode === "edit" ? renderPreferencesEdit() : renderPreferencesView());
    body.append(renderSignOut());
  }

  // 초기: 스켈레톤 → 선호 로드 후 채움.
  body.append(renderAccount(), el("p", "mypage-loading", "Loading…"));
  getPreferences()
    .then((env) => {
      prefs = env?.ok
        ? env.data
        : { interests: [], prefer_shorter_walks: null, open_preferences: [] };
    })
    .catch(() => {
      prefs = { interests: [], prefer_shorter_walks: null, open_preferences: [] };
    })
    .finally(render);

  return root;
}
