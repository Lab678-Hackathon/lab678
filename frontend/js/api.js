/**
 * 백엔드 추천 API 호출. 실패해도 Mock 후보로 바꾸지 않고, 결과 종류를 그대로 구분해서 돌려줘요.
 * 요청·응답 형식은 docs/development/examples/outing-request.json / outing-response.json 기준.
 */

/** 같은 주소(개발 서버·Vercel 프록시)로 부르면 CORS 설정이 필요 없어요. */
const API_BASE = '';

/**
 * 시험 모드: 주소에 ?mode=recorded 를 붙이면 기록 데이터, 없으면 실시간(live).
 * @returns {'recorded'|'live'}
 */
export function testMode() {
  return new URLSearchParams(location.search).get('mode') === 'recorded' ? 'recorded' : 'live';
}

/**
 * 추천을 요청해요.
 * @param {object} body request_kind, start_location{label,lat,lng}, start_at, end_at, category
 * @returns {Promise<{kind:'ready'|'no_results'|'need_input'|'error', data?:object, message?:string}>}
 *   ready: 후보 있음 · no_results: 0건 · need_input: 입력 오류(400) · error: 서버·네트워크 오류
 */
export async function requestRecommend(body) {
  let res;
  try {
    res = await fetch(`${API_BASE}/preview/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, mode: testMode() }),
    });
  } catch {
    return { kind: 'error', message: '인터넷 연결을 확인하고 다시 시도해 주세요.' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* 본문이 JSON 이 아니면 아래에서 오류로 처리 */ }
  if (res.status === 200 && data?.status === 'ready') return { kind: 'ready', data };
  if (res.status === 200 && data?.status === 'no_results') return { kind: 'no_results', data };
  if (res.status === 400) return { kind: 'need_input', message: data?.message || '입력한 조건을 확인해 주세요.' };
  return { kind: 'error', message: data?.message || '추천을 불러오지 못했어요. 다시 시도해 주세요.' };
}
