/** 실제 Naito 다회차→자동 설정→기록 추천→상세 및 실제 서울시 복수 분류 조회 검증.
 * 실행: PLAYWRIGHT_MODULE 설정 후 node utils/scripts/check_natural_flow.cjs.
 * 사용자 브라우저를 조작하지 않으며 공개 장소/시험 발화만 .local/natural-flow에 기록한다.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LAB678_TEST_BASE || 'http://127.0.0.1:5174';
const output = path.resolve(__dirname, '../../.local/natural-flow');

/** 발화 하나를 보내 실제 응답과 화면 반영을 함께 기다린다. */
async function say(page, message) {
  await page.locator('#chat-text').fill(message);
  const response = page.waitForResponse(r => r.url().endsWith('/preview/chat'));
  await page.locator('#chat-send').click();
  const r = await response;
  const body = await r.json();
  assert.equal(r.status(), 200, body.message);
  await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
  return body;
}

/** 실제 공급자와 UI 경계를 한 구간으로 검사한다. 실패는 결과에 남기고 비정상 종료한다. */
async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const report = { base, ai: 'Naito claude-sonnet-4 live', ui_recommendation: 'recorded', turns: [], checks: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/?mode=recorded&debug=1&season=none#/search`);
    await page.locator('#chat-text').waitFor();
    let body = await say(page, '음악을 듣고 싶어');
    report.turns.push(body);
    assert.deepEqual(new Set(body.updated_condition_draft.categories), new Set(['국악', '클래식', '콘서트']));
    assert.equal(body.updated_condition_draft.music_followup, true);
    assert.match(body.assistant_text, /어떤 음악/);
    body = await say(page, '특별히 좋아하는 장르는 없고 골고루 듣고 싶어');
    report.turns.push(body);
    assert.equal(body.updated_condition_draft.music_followup, false);
    assert.equal(body.updated_condition_draft.categories.length, 3);
    assert.match(body.assistant_text, /어디에서/);
    await page.locator('[data-start-key="qa"]').click();
    await page.locator('#f-date').fill('2026-10-31');
    body = await say(page, '음악 대신 전시만 볼래. 오후 2시부터 오후 5시까지. 무료만, 예고를 빛낸 사람 전시는 빼줘. 적게 걷고 싶어.');
    report.turns.push(body);
    assert.equal(body.conflicts.length, 0);
    assert.deepEqual(body.updated_condition_draft.categories, ['전시']);
    assert.equal(body.updated_condition_draft.free_only, true);
    assert.equal(body.updated_condition_draft.walking_preference, 'short');
    assert.ok(body.updated_condition_draft.exclude_terms.some(t => /예고/.test(t)));
    assert.equal(await page.locator('#f-start').inputValue(), '14:00');
    assert.equal(await page.locator('#f-end').inputValue(), '17:00');
    await page.locator('#btn-search').click();
    await page.locator('#confirm').waitFor({ state: 'visible' });
    assert.match(await page.locator('#confirm-preferences').textContent(), /무료/);
    await page.screenshot({ path: path.join(output, 'confirmation.png'), fullPage: true });
    const response = page.waitForResponse(r => r.url().endsWith('/preview/recommend'));
    await page.locator('#btn-search').click();
    const r = await response;
    assert.equal(r.status(), 200);
    report.request = r.request().postDataJSON();
    report.result = await r.json();
    assert.equal(report.request.free_only, true);
    assert.equal(report.request.walking_preference, 'short');
    assert.ok(report.result.candidates.length > 0);
    assert.ok(report.result.candidates.every(c => c.fee_type === '무료' && !c.title.includes('예고를 빛낸 사람')));
    assert.ok(report.result.excluded_count >= 1);
    await page.waitForURL('**#/results');
    assert.match(await page.locator('#result-preferences').textContent(), /실제 도보/);
    await page.screenshot({ path: path.join(output, 'results.png'), fullPage: true });
    await page.locator('#s03-list .place-card').first().getByRole('button', { name: '자세히 보기' }).click();
    await page.locator('#s04-pick').waitFor();
    assert.equal(await page.locator('#s04-pick').getAttribute('data-id'), report.result.candidates[0].id);
    assert.deepEqual(errors, []);
    report.checks.push('PASS: 음악 탐색→골고루→복합 조건 자동 설정→실제 요청 선호→기록 후보 선별→상세 ID');
    const live = await page.request.post(`${base}/preview/recommend`, { data: {
      ...report.request, mode: 'live', category: '국악', categories: ['국악', '클래식', '콘서트'],
      free_only: false, exclude_terms: [], start_at: '2026-11-01T14:00:00+09:00', end_at: '2026-11-01T17:00:00+09:00'
    }, timeout: 30000 });
    report.live_status = live.status(); report.live_result = await live.json();
    assert.equal(live.status(), 200);
    assert.equal(report.live_result.mode, 'live');
    assert.deepEqual(report.live_result.queried_categories, ['국악', '클래식', '콘서트']);
    report.checks.push('PASS: 미래 날짜 서울시 실제 3분류 조회; 0건은 정상 조회와 구분 기록');
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1; }
  finally { await browser.close(); await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify({ status: report.status, checks: report.checks, error: report.error, live_candidates: report.live_result?.candidates?.length }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
