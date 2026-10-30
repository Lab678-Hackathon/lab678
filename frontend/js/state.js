// 클라이언트 상태 컨테이너. 화면 로직(pages/)과 분리.
import { getSession, postRoute, putSession } from "./api.js";
import { isSignedIn } from "./auth.js";

export const state = {
  request: null, // 마지막 추천 요청 조건(payload)
  candidates: [], // 현재 후보 목록
  focusedId: null, // 포커스(스와이프/핀 탭) — 선택 확정과 다름
  selectedId: null, // Select experience 로 확정한 현재 선택 (선택 ≠ 방문)
};

// 정식 로그인(비익명) 여부. 익명 세션은 false → FR-L1(재추천 시 로그인 유도) 유지.
// Google 로그인/연결은 L1d에서 활성화되면 이 값이 true 가 된다.
export function isLoggedIn() {
  return isSignedIn();
}

// ── 비회원 '추천 1회' 정책 (FR-L1) ──
// 비회원은 추천 A 결과를 1회까지 받을 수 있고, 그 다음 재추천은 로그인 유도.
// 뒤로가기/새로고침으로 폼을 재사용해도 '이미 1회 썼음'이 유지되도록 localStorage 에 기록한다.
// (클라이언트 게이팅 — 기존 로그인 시트와 동일 신뢰수준. 하드 enforce 는 추후 서버 과제.)
const GUEST_USED_KEY = "konnect.guestRecommended";

export function markGuestRecommended() {
  try {
    localStorage.setItem(GUEST_USED_KEY, "1");
  } catch {
    /* 저장 불가(시크릿 등) — 이 세션에선 게이팅이 약해질 수 있음(graceful) */
  }
}

export function guestRecommendUsed() {
  try {
    return localStorage.getItem(GUEST_USED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setResults(request, candidates) {
  state.request = request;
  state.candidates = candidates;
  state.focusedId = candidates[0]?.id ?? null;
}

// ── 현재 위치 (메인 진입 시 1회 동의 요청) ──
// 홈 진입 때 브라우저 위치 권한을 한 번 물어 좌표를 캐시한다. 이후 입력 폼의 기본
// 'Current location' 이 실제 GPS 좌표를 싣고 추천 조회로 전달된다(사전 입력 — 시트에서
// 다시 'Current location' 을 누르지 않아도 됨). 거부/실패/미지원은 조용히 null(§6-7:
// 좌표는 '출발점' 한정이며 강제하지 않는다 — GPS 자동 방문판정 아님).
let _geoCoords = null; // { lat, lng } | null
let _geoAsked = null; // 진행 중/완료된 요청 Promise (중복 프롬프트 방지)

export function cachedCoords() {
  return _geoCoords;
}

// 멱등 — 여러 번 불러도 위치 권한은 한 번만 요청한다(캐시된 Promise 재사용).
export function ensureCurrentLocation() {
  if (_geoAsked) return _geoAsked;
  if (!navigator.geolocation) {
    _geoAsked = Promise.resolve(null);
    return _geoAsked;
  }
  _geoAsked = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _geoCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(_geoCoords);
      },
      () => resolve(null), // 거부/타임아웃 → null (강제 안 함, graceful)
      { timeout: 10000, maximumAge: 300000 },
    );
  });
  return _geoAsked;
}

// ── 현재 선택 영속 (A6, 비로그인 — localStorage. Phase 2에서 계정 연결) ──
// 선택 ≠ 방문. GPS 자동 방문판정 없음.
const CHOICE_KEY = "konnect.currentChoice";

export function saveChoice(request, env, candidateId) {
  state.selectedId = candidateId;
  const at = Date.now();
  try {
    localStorage.setItem(
      CHOICE_KEY,
      JSON.stringify({ request, env, candidateId, at }),
    );
  } catch {
    /* 저장 불가(시크릿 모드 등)여도 현 세션 선택은 유지 */
  }
  // 서버(계정)에도 영속 — 로그아웃·재로그인·기기 변경에도 '내가 고른 결과'가 유지되게(FR-L2).
  // 사용자가 고른 그 후보 1개 + origin 을 저장(참조+표시 스냅샷). 이는 '현재 선택' 상태 저장
  // (§4.4)이지 외부 API 응답 캐시가 아니다 — 추천 질의에 재사용하거나 타인에게 제공하지 않는다.
  const candidate = (env?.data?.candidates || []).find((c) => c.id === candidateId);
  putSession({
    last_request: request,
    current_choice: { candidateId, at, candidate, origin: env?.data?.origin, request },
  }).catch(() => {});
}

export function loadChoice() {
  try {
    return JSON.parse(localStorage.getItem(CHOICE_KEY) || "null");
  } catch {
    return null;
  }
}

// 서버(DB)에 저장된 현재 선택을 로컬로 복원 — 재로그인·기기 변경 시 '내가 고른 결과' 재현.
// 로그인 사용자만. 성공 시 localStorage 를 DB 스냅샷으로 채워 home/mypage(loadChoice)가 렌더.
// 반환: 서버에서 '새로' 채웠으면 true(= 홈 재렌더 필요), 이미 로컬에 있거나 없으면 false.
export async function restoreChoiceFromServer() {
  if (!isSignedIn()) return false;
  if (loadChoice()) return false; // 로컬에 이미 있으면 재조회·재렌더 불필요(clobber 방지)
  try {
    const env = await getSession();
    const cc = env?.ok ? env.data?.current_choice : null;
    if (!cc?.candidate || !cc?.candidateId) return false;
    state.selectedId = cc.candidateId;
    const local = {
      request: cc.request,
      candidateId: cc.candidateId,
      at: cc.at,
      env: { data: { candidates: [cc.candidate], origin: cc.origin } },
    };
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(local));
    } catch {
      /* noop */
    }
    return true;
  } catch {
    return false;
  }
}

// 로그아웃 시 로컬 뷰만 비운다(DB 는 유지 → 재로그인하면 복원). 서버 삭제는 명시적 ✕ 때만.
export function clearLocalChoice() {
  state.selectedId = null;
  try {
    localStorage.removeItem(CHOICE_KEY);
  } catch {
    /* noop */
  }
}

export function clearChoice() {
  state.selectedId = null;
  try {
    localStorage.removeItem(CHOICE_KEY);
  } catch {
    /* noop */
  }
  putSession({ current_choice: null }).catch(() => {}); // 명시적 삭제 → 서버도 비움
}

// ── 저장된 B 문화루트 (DB 정본 — 로그아웃·기기 변경에도 유지. 참조만 저장, 열 때 라이브 재조립) ──
// ref = { stops:[title...], origin, start_at, end_at, note, conditions }. 사실(가격·경로선)은
// 저장하지 않는다 — 캐싱 금지 규약 준수 + 신선도(home/mypage 가 postRoute 로 매번 재조회).
export async function saveRoute(ref) {
  const env = await putSession({ current_route: { ...ref, at: Date.now() } });
  return env?.ok ?? false;
}

export async function loadRoute() {
  if (!isSignedIn()) return null; // 세션/토큰 없으면 호출 안 함(불필요한 401 방지)
  try {
    const env = await getSession();
    return env?.ok ? (env.data?.current_route ?? null) : null;
  } catch {
    return null; // 세션없음 → 저장 루트 없음(graceful)
  }
}

export async function clearRoute() {
  try {
    await putSession({ current_route: null });
  } catch {
    /* noop */
  }
}

// 저장된 ref → 라이브 재조립(사실·경로선 신선). 시간창은 **저장 당시 시계시간을 오늘 날짜로**
// 쓴다 — 시간 판정은 '지금'이 아니라 '창 대비 운영시간'이라, 지금이 몇 시든 저장한 방문 시간대
// (예: 14:00–18:00) 기준으로 판정돼 루트가 유지된다(now 기준 창은 심야엔 전부 closed 가 됨).
// pin_titles 로 저장 스톱을 고정 복원하고, 못 찾은 스톱은 조용히 빠진다. 실패/빈결과는 null.
// 저장된 시작/종료를 'HH:MM' 로 정규화. 과거 저장분은 datetime-local("YYYY-MM-DDTHH:MM")로
// 들어가 있을 수 있어(구 chat 저장 버그), 'T' 뒤 시각만 뽑아 ISO 재조립 시 start_at 오염을 막는다.
export function hmOf(value, fallback) {
  const s = String(value ?? "");
  const t = s.includes("T") ? s.split("T")[1] : s;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : fallback;
}

export async function rebuildSavedRoute(ref) {
  if (!ref?.stops?.length) return null;
  const sh = hmOf(ref.start_hm, "10:00");
  let eh = hmOf(ref.end_hm, "18:00");
  // 종료가 시작 이하(비정상)면 안전하게 시작+4시간으로.
  if (eh <= sh) {
    const [h, m] = sh.split(":").map(Number);
    const e = new Date();
    e.setHours(h + 4, m, 0, 0);
    eh = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  }
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const payload = {
    start_location: ref.origin || { label: "Current location" },
    start_at: `${ymd}T${sh}:00`,
    end_at: `${ymd}T${eh}:00`,
    pin_titles: ref.stops,
  };
  // 라이브 재조회라 한 번은 일시적 실패(네트워크·외부 API 지연)가 날 수 있다 → 1회 재시도.
  // 결과가 실제로 비는 경우(스톱 마감 등)는 재시도해도 같으므로 '루트 있음'일 때만 성공으로 본다.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const env = await postRoute(payload);
      const data = env?.ok ? (env.data ?? null) : null;
      if (data?.routes?.length) return data; // 성공(스톱 있음)
      if (attempt === 1) return data; // 마지막 시도 결과(빈 루트/ null — 투명 안내용)
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}
