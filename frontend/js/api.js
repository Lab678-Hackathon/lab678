/**
 * 백엔드 API 호출. 실패해도 Mock 후보로 바꾸지 않고, 결과 종류를 그대로 구분해서 돌려줘요.
 * 계약: docs/development/recommend-api.md, docs/development/place-search-api.md
 */

/**
 * API 주소. index.html 의 <meta name="lab678-api"> 값(Render https 주소)을 써요.
 * 내 PC(localhost)에서는 같은 주소(개발 서버 프록시)로 불러요.
 */
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE = LOCAL ? '' : (document.querySelector('meta[name="lab678-api"]')?.content || '').replace(/\/$/, '');

/**
 * 서버 깨우기. 무료 Render 는 쉬면 잠들어서 첫 응답이 30초~1분 걸려요.
 * 내 PC 에서는 개발 서버 프록시라 바로 준비됨으로 봐요.
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} 준비되면 true, 시간이 지나도 응답이 없으면 false
 */
export async function wakeServer(timeoutMs = 75000) {
  if (LOCAL) return true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_BASE}/healthz`, { signal: ctrl.signal, cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 시험 모드: 주소에 ?mode=recorded 를 붙이면 기록 데이터, 없으면 실시간(live).
 * @returns {'recorded'|'live'}
 */
export function testMode() {
  return new URLSearchParams(location.search).get('mode') === 'recorded' ? 'recorded' : 'live';
}

/**
 * JSON POST. 응답이 HTML 오류여도 죽지 않게 본문 파싱 실패를 따로 처리해요.
 * @returns {Promise<{status:number, data:object|null}|null>} 통신 자체가 실패하면 null
 */
async function post(path, body, signal) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return null;
  }
  let data = null;
  try { data = await res.json(); } catch { /* HTML 오류 등 */ }
  return { status: res.status, data };
}

/**
 * 추천을 요청해요.
 * @param {object} body request_kind, start_location{label,lat,lng}, start_at, end_at, category
 * @returns {Promise<{kind:'ready'|'no_results'|'need_input'|'error', data?:object, message?:string, field?:string, code?:string}>}
 *   ready: 후보 있음 · no_results: 0건 · need_input: 입력 오류(400, field 가 있으면 해당 칸) · error: 서버·네트워크 오류
 */
export async function requestRecommend(body) {
  const r = await post('/preview/recommend', { ...body, mode: testMode() });
  if (!r) return { kind: 'error', message: '인터넷 연결을 확인하고 다시 시도해 주세요.' };
  const { status, data } = r;
  if (status === 200 && data?.status === 'ready') return { kind: 'ready', data };
  if (status === 200 && data?.status === 'no_results') return { kind: 'no_results', data };
  if (status === 400) return { kind: 'need_input', message: data?.message || '입력한 조건을 확인해 주세요.', field: data?.field, code: data?.code };
  return { kind: 'error', message: data?.message || '추천을 불러오지 못했어요. 다시 시도해 주세요.' };
}

/**
 * 출발지를 장소명·주소로 찾아요. 사용자가 결과 중 하나를 골라야 출발지가 정해져요.
 * @param {string} query
 * @param {AbortSignal} signal 새 검색이 시작되면 이전 요청을 취소해요
 * @returns {Promise<{kind:'ready'|'no_results'|'need_input'|'error', places?:object[], message?:string}>}
 */
export async function searchPlaces(query, signal) {
  const r = await post('/preview/places', { query, type: 'keyword' }, signal);
  if (!r) return { kind: 'error', message: '인터넷 연결을 확인하고 다시 찾아 주세요.' };
  const { status, data } = r;
  if (status === 200 && data?.status === 'ready') return { kind: 'ready', places: data.places || [] };
  if (status === 200 && data?.status === 'no_results') return { kind: 'no_results', message: '검색 결과가 없어요. 다른 이름이나 주소로 찾아 주세요.' };
  if (status === 400) return { kind: 'need_input', message: data?.message || '검색어를 확인해 주세요.' };
  if (status === 429) return { kind: 'error', message: '검색이 잠시 몰렸어요. 조금 뒤에 다시 찾아 주세요.' };
  return { kind: 'error', message: '출발지 검색을 지금 쓸 수 없어요. 현재 위치를 쓰거나 잠시 뒤 다시 찾아 주세요.' };
}
