// 뷰 컨트롤러: 웰컴(W-0) → 홈(LF-01) → 입력(LF-02) → 결과(LF-03) 전환.
// 단일 #view 컨테이너에 주입. 결과는 지도-풀스크린(full-bleed)이라 뷰별로
// .app 패딩을 토글한다.
import { postRecommend, putSession, getPreferences, putPreferences } from "./api.js";
import { ready as authReady, onAuthChange, isSignedIn, displayName } from "./auth.js";
import { renderWelcomeView } from "./pages/welcome.js";
import { renderHomeView } from "./pages/home.js";
import { renderInputView } from "./pages/input.js";
import { renderLoadingView } from "./pages/loading.js";
import { renderErrorView } from "./pages/error.js";
import { renderResultsView } from "./pages/results.js";
import { renderChatView } from "./pages/chat.js";
import { renderOnboardingView } from "./pages/onboarding.js";
import { renderMyPageView } from "./pages/mypage.js";
import { renderChoiceView } from "./pages/choice.js";
import { renderRouteView } from "./pages/route.js";
import {
  clearLocalChoice,
  guestRecommendUsed,
  isLoggedIn,
  loadChoice,
  markGuestRecommended,
  restoreChoiceFromServer,
  setResults,
} from "./state.js";
import { showLoginSheet } from "./components/login-sheet.js";

const viewEl = document.getElementById("view");
const WELCOME_KEY = "konnect.seenWelcome";

// fullBleed=true → 지도가 프레임을 꽉 채우는 결과 뷰(패딩 제거).
function mount(node, { fullBleed = false } = {}) {
  viewEl.classList.toggle("app--bleed", fullBleed);
  viewEl.replaceChildren(node);
  viewEl.scrollTop = 0;
}

export function showWelcome() {
  mount(renderWelcomeView({ onStart: markSeenAndHome }), { fullBleed: true });
}

export function showHome() {
  mount(
    renderHomeView({
      onStartA: () => showInput(),
      onOpenChat: openRouteB,
      onViewChoice: showSavedChoice,
      onOpenMyPage: showMyPage,
      onViewRoute: (p) => showSavedRoute({ ...p, onBack: showHome }),
    }),
    { fullBleed: true },
  );
}

// AG-4 단일 챗봇 — FAQ(RAG)·즉시추천·문화루트를 하나의 대화 흐름으로.
export function showChat() {
  mount(renderChatView({ onBack: showHome }), { fullBleed: true });
}

// 추천 B(Plan a route) 진입 — 비로그인이면 '로그인 필요' 안내 + 로그인 여부를 묻는다.
// 'Continue with Google' = 예(로그인) / 'Not now' = 아니오(홈 유지). 로그인 사용자만 챗 진입.
function openRouteB() {
  if (!isLoggedIn()) {
    showLoginSheet({
      title: "Sign in to plan a route",
      subtitle:
        "Planning a culture route needs a Google sign-in. Would you like to sign in now?",
    });
    return;
  }
  showChat();
}

// My Page (L3) — 로그인 사용자만 진입(홈 Account). 뒤로=홈, 선택 보기=결과, 루트 보기=루트 뷰.
export function showMyPage() {
  mount(
    renderMyPageView({
      onBack: showHome,
      onHome: showHome,
      onViewChoice: showSavedChoice,
      onViewRoute: (p) => showSavedRoute({ ...p, onBack: showMyPage }),
    }),
  );
}

// 저장된 B 문화루트 상세 — 재조립된 RouteData 를 경로선 지도 + 루트 카드로 렌더(홈·My Page → View).
// 뒤로=온 곳(기본 홈), 홈=메인.
export function showSavedRoute({ data, trip, onBack } = {}) {
  mount(
    renderRouteView({
      data,
      trip,
      onBack: onBack || showHome,
      onHome: showHome,
    }),
  );
}

// LF-09 선택 상세. saved=false(저장 전, Select 직후) / true(저장됨, 홈·마이페이지 진입).
export function showChoice({ candidate, request, env, saved, onBack }) {
  mount(
    renderChoiceView({
      candidate,
      request,
      env,
      saved,
      onBack: onBack || (() => showResults({ request, env })),
      onHome: showHome,
      onSeeMap: () => showResults({ request, env }),
      onFindOther: () => showInput(request),
      onBackToResults: () => showResults({ request, env }),
    }),
  );
}

// 저장된 현재 선택 보기(홈·마이페이지 카드 → "Your current choice"). loadChoice 자립.
export function showSavedChoice() {
  const saved = loadChoice();
  const candidate = saved?.env?.data?.candidates?.find(
    (c) => c.id === saved.candidateId,
  );
  if (!candidate) return showHome();
  showChoice({
    candidate,
    request: saved.request,
    env: saved.env,
    saved: true,
    onBack: showHome,
  });
}

export function showInput(prefill) {
  mount(
    renderInputView({
      prefill,
      onBack: showHome,
      onHome: showHome,
      onRecommend: startRecommend,
    }),
  );
}

// 공통 조회 플로우: 로딩(shimmer) → 성공(결과) / 취소(입력) / 실패(오류 화면).
export function startRecommend(payload) {
  // [FR-L1] 비회원은 추천 1회까지 — 이미 1회 썼으면(뒤로가기로 폼 재사용 포함) 조회하지
  // 않고 로그인 유도. 모든 재추천 경로(홈 Right now·입력 CTA·Edit)가 이 길목으로 모인다.
  if (!isLoggedIn() && guestRecommendUsed()) {
    showLoginSheet();
    return;
  }

  const controller = new AbortController();
  let done = false;

  mount(
    renderLoadingView({
      request: payload,
      conditions: payload.conditions ?? null,
      onCancel: () => {
        if (done) return;
        done = true;
        controller.abort();
        showInput(payload); // 입력값 유지한 채 복귀
      },
    }),
    { fullBleed: true },
  );

  postRecommend(payload, controller.signal)
    .then((env) => {
      if (done) return; // 취소됨
      done = true;
      if (!env.ok) {
        showError(payload); // 시스템 예외 → 전용 오류 화면
        return;
      }
      setResults(payload, env.data.candidates);
      // 비회원의 '무료 1회'를 소진 표시 — 다음 재추천부터 로그인 유도(FR-L1).
      if (!isLoggedIn()) markGuestRecommended();
      // 현재 요청조건을 서버에 영속(선택 전에도 연속성 — L1c/FR-L2). 실패 무영향.
      putSession({ last_request: payload }).catch(() => {});
      showResults({ request: payload, env });
    })
    .catch(() => {
      if (done) return; // Cancel 로 인한 AbortError
      done = true;
      showError(payload); // 네트워크 실패 → 전용 오류 화면
    });
}

// 전용 오류 화면 — 조건 유지, Try again / Edit conditions.
export function showError(request) {
  mount(
    renderErrorView({
      request,
      conditions: request.conditions ?? null,
      onRetry: () => startRecommend(request),
      onEdit: () => showInput(request),
      onBack: () => showInput(request),
    }),
    { fullBleed: true },
  );
}

export function showResults({ request, env }) {
  mount(
    renderResultsView({
      request,
      env,
      onBack: showHome,
      onHome: showHome,
      onEdit: () => showInput(request),
      // Select experience → 저장 전 상세(LF-09). 저장은 거기 "Save choice"에서.
      onSelect: (id) => {
        const candidate = env.data.candidates.find((c) => c.id === id);
        if (candidate)
          showChoice({
            candidate,
            request,
            env,
            saved: false,
            onBack: () => showResults({ request, env }),
          });
      },
    }),
    { fullBleed: true },
  );
}

// P9-1 선호 온보딩 — 정식 가입 후 '처음 한 번'만. needs_onboarding 은 서버가 판정
// (onboarded_at 부재). Save·Skip 둘 다 PUT 으로 노출을 종료시켜 재노출을 막는다.
let onboardingChecked = false; // 로드당 1회만 서버 확인(중복 onAuthChange 방어)

export function showOnboarding() {
  const finish = (fields) =>
    putPreferences(fields)
      .catch(() => {}) // 저장 실패해도 흐름을 막지 않음(graceful)
      .finally(showHome);
  mount(
    renderOnboardingView({
      onSubmit: finish,
      onSkip: () =>
        finish({ interests: [], prefer_shorter_walks: null, open_preferences: [] }),
    }),
  );
}

async function maybeShowOnboarding() {
  if (onboardingChecked || !isSignedIn()) return;
  onboardingChecked = true;
  try {
    const env = await getPreferences();
    if (env.ok && env.data?.needs_onboarding) showOnboarding();
  } catch {
    /* 확인 실패 시 조용히 건너뜀(온보딩은 1회 Should) */
  }
}

function markSeenAndHome() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* 저장 불가여도 진행 */
  }
  showHome();
}

// 첫 실행이면 웰컴(W-0), 이후엔 홈(LF-01)으로 진입.
let seen = false;
try {
  seen = localStorage.getItem(WELCOME_KEY) === "1";
} catch {
  /* noop */
}

// 세션(익명/정식) 준비 후 첫 화면을 그린다 → 홈의 로그인 상태(Hello·Log out)가
// 첫 페인트에 반영된다. auth 실패해도 화면은 그린다(비인증 진행).
// 첫 화면은 네트워크를 기다리지 않고 즉시 그린다(로그인 체감 지연↓). 저장된 '현재 선택'
// 복원은 백그라운드로 — 새로 채워지면 그때 홈만 재렌더. (A 선택·B 루트 카드는 비동기로 채움.)
authReady().finally(() => {
  if (seen) showHome();
  else showWelcome();
  maybeShowOnboarding(); // 온보딩 판정(getPreferences)도 비블로킹
  restoreChoiceFromServer().then((restored) => {
    if (restored && document.querySelector(".home")) showHome();
  });
});

// 로그인/로그아웃/OAuth 복귀로 세션이 바뀌면, 홈이 떠 있을 때 재렌더(Hello·Log out 반영).
onAuthChange(() => {
  if (!isSignedIn()) clearLocalChoice(); // 로그아웃 → 로컬 선택 숨김(DB 유지)
  if (document.querySelector(".home")) showHome();
  if (document.querySelector(".home") || document.querySelector(".welcome"))
    maybeShowOnboarding();
  // 로그인 → DB 선택 복원(백그라운드). 새로 채웠으면 홈 재렌더.
  restoreChoiceFromServer().then((restored) => {
    if (restored && document.querySelector(".home")) showHome();
  });
});
