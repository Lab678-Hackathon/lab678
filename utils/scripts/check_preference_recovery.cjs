/** 모바일 크기 로컬 팀 화면의 0건→조건 해제 동의→재추천→새로고침/오류를 검사한다.
 * 초기 선호는 명시적 시험 상태 주입, 조건 해제는 실제 Naito 1회, 추천은 recorded, 502는 모의.
 * 실행: PLAYWRIGHT_MODULE 설정 후 node utils/scripts/check_preference_recovery.cjs.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(__dirname, '../../.local/preference-recovery');

/** 최종 조건 확인과 추천 실행을 나누고 HTTP/화면 이동을 확인한다. */
async function recommend(page) {
  await page.locator('#btn-search').click();
  await page.locator('#confirm').waitFor({ state: 'visible' });
  const response = page.waitForResponse(r => r.url().endsWith('/preview/recommend'));
  await page.locator('#btn-search').click();
  const r = await response;
  assert.equal(r.status(), 200);
  await page.waitForURL('**#/results');
  return { request: r.request().postDataJSON(), result: await r.json() };
}

/** 독립 브라우저에서 회복 흐름과 확정 조건의 실제 전송값을 검증한다. */
async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const report = { modes: { initial_preferences: 'fixture', chat: 'Naito live', recommendation: 'recorded', error: 'mock 502' }, checks: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5174/?mode=recorded&debug=1&season=none#/search');
    await page.locator('#chat-text').waitFor();
    await page.evaluate(async () => {
      const { state, save } = await import('/js/state.js');
      Object.assign(state.form, { startKey: 'qa', date: '2026-10-31', startTime: '14:00', endTime: '17:00', category: '전시', kind: 'place' });
      state.chat.preferences = { categories: ['전시'], exclude_terms: ['전시'], free_only: true, budget_krw: 20000 };
      state.confirmed = null; save();
    });
    await page.reload(); await page.locator('#chat-text').waitFor();
    report.empty = await recommend(page);
    assert.equal(report.empty.result.status, 'no_results');
    assert.deepEqual(report.empty.result.candidates, []);
    assert.equal(await page.locator('#s03-empty').isVisible(), true);
    assert.match(await page.locator('#result-preferences').textContent(), /조건은 그대로/);
    report.checks.push('PASS: 제한 때문에 0건일 때 자동 완화/Mock 없음');
    await page.getByRole('button', { name: '조건 바꾸기', exact: true }).click();
    await page.locator('#chat-text').fill('찾는 분류는 전시로 유지하고, 장소 제외 조건을 모두 취소해줘. 무료 제한도 풀고 관람료 예산 제한도 없애줘.');
    const chat = page.waitForResponse(r => r.url().endsWith('/preview/chat'));
    await page.locator('#chat-send').click();
    const cr = await chat; assert.equal(cr.status(), 200); report.chat = await cr.json();
    await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
    assert.ok(report.chat.conflicts.some(c => c.field === 'exclude_terms'));
    assert.ok(report.chat.conflicts.some(c => c.field === 'free_only'));
    assert.ok(report.chat.conflicts.some(c => c.field === 'budget_krw'));
    assert.equal(await page.locator('#btn-search').isDisabled(), true);
    await page.getByRole('button', { name: '변경 모두 반영', exact: true }).click();
    await page.reload(); await page.locator('#chat-text').waitFor();
    const prefs = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lab678_flow')).chat.preferences);
    assert.deepEqual(prefs.exclude_terms, []); assert.equal(prefs.free_only, false); assert.equal(prefs.budget_krw, 'any');
    report.checks.push('PASS: 확정 선호 해제는 동의 후 반영, 새로고침 보존');
    report.restored = await recommend(page);
    assert.equal(report.restored.request.free_only, false);
    assert.deepEqual(report.restored.request.exclude_terms, []);
    assert.equal(report.restored.request.budget_krw, 'any');
    assert.equal(report.restored.result.status, 'ready');
    assert.ok(report.restored.result.candidates.length > 0);
    await page.reload(); await page.locator('#s03-list .place-card').first().waitFor();
    assert.doesNotMatch(await page.locator('#result-preferences').textContent(), /무료 행사만|예산 이내/);
    await page.locator('#s03-list .place-card').first().getByRole('button', { name: '자세히 보기' }).click();
    await page.locator('#s04-pick').waitFor();
    assert.equal(await page.locator('#s04-pick').getAttribute('data-id'), report.restored.result.candidates[0].id);
    report.checks.push('PASS: 해제한 조건으로 재추천→새로고침→상세 ID 동일');
    await page.goto('http://127.0.0.1:5174/?mode=recorded&debug=1&season=none#/search');
    await page.locator('#chat-text').waitFor();
    await page.locator('#f-end').fill('18:00'); await page.locator('#f-start').click();
    await page.route('**/preview/recommend', route => route.fulfill({ status: 502, json: { status: 'error', message: '검증용 추천 조회 실패' } }));
    await page.locator('#btn-search').click();
    const failure = page.waitForResponse(r => r.url().endsWith('/preview/recommend'));
    await page.locator('#btn-search').click(); await failure;
    await page.locator('#confirm-error').waitFor({ state: 'visible' });
    assert.match(await page.locator('#confirm-error').textContent(), /조회 실패/);
    assert.equal(await page.locator('#f-end').inputValue(), '18:00');
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lab678_flow')));
    assert.deepEqual(stored.result.candidates.map(c => c.id), report.restored.result.candidates.map(c => c.id));
    assert.equal(page.url().endsWith('#/search'), true);
    report.checks.push('PASS: 추천 502 후 조건/이전 결과 보존, 실패 화면 유지');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, 'failure-preserved.png'), fullPage: true });
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1; }
  finally { await browser.close(); await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify({ status: report.status, checks: report.checks, error: report.error }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
