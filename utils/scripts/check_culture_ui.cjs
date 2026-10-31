/** 실제 서울시/관광공사 입력→카드→상세, 소스 전환·실패 보존·모의0건을 구간 검증한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LAB678_TEST_BASE || 'http://127.0.0.1:5175';

/** 조건 확인과 추천을 눌러 API 응답과 화면 이동을 함께 관찰한다. */
async function submit(page, success = true) {
  await page.locator('#btn-search').click();
  await page.locator('#confirm').waitFor({ state: 'visible' });
  const response = page.waitForResponse(r => r.url().endsWith('/preview/recommend'));
  await page.locator('#btn-search').click();
  const r = await response;
  if (success) await page.waitForURL('**#/results');
  else await page.locator('#confirm-error').waitFor({ state: 'visible' });
  return { status: r.status(), request: r.request().postDataJSON(), body: await r.json() };
}

/** 실데이터 확인 뒤 같은 브라우저에서 오류·빈 결과를 모의하며 키나 헤더를 수집하지 않는다. */
async function main() {
  await fs.mkdir('.local/culture-ui', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const report = { base, checked_at: new Date().toISOString(), checks: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/?debug=1&season=none#/search`);
    await page.locator('#culture-source').waitFor();
    await page.locator('[data-start-key="qa"]').click();
    await page.locator('#f-date').fill('2026-11-01');
    await page.locator('#f-start').fill('14:00');
    await page.locator('#f-end').fill('17:00');
    await page.locator('#culture-source').selectOption('tour');
    const tour = await submit(page);
    assert.equal(tour.status, 200); assert.equal(tour.request.culture_source, 'tour');
    assert.equal(tour.request.category, '전체');
    assert.ok(tour.body.candidates.length > 0);
    assert.match(await page.locator('#s03-source').textContent(), /한국관광공사/);
    const id = tour.body.candidates[0].id;
    assert.equal(await page.locator('#s03-list .place-card').first().getAttribute('data-id'), id);
    await page.locator('#s03-map .pin').first().waitFor();
    let tilesLoaded = false;
    try {
      await page.waitForFunction(() => [...document.querySelectorAll('#s03-map img.leaflet-tile')].some(i => i.complete && i.naturalWidth > 100), null, { timeout: 10000 });
      tilesLoaded = true;
    } catch { /* 지도 핀·카드 검사와 배경 타일 네트워크 상태는 별도로 기록한다. */ }
    report.team_map_tiles_loaded = tilesLoaded;
    await page.screenshot({ path: '.local/culture-ui/tour-results.png', fullPage: true });
    await page.locator('#s03-list .place-card').first().getByRole('button', { name: '자세히 보기' }).click();
    await page.locator('#s04-pick').waitFor();
    assert.equal(await page.locator('#s04-pick').getAttribute('data-id'), id);
    assert.match(await page.locator('#s04-body').textContent(), /한국관광공사/);
    assert.match(await page.locator('#s04-body').textContent(), /확인 필요/);
    await page.reload();
    await page.locator('#s04-pick').waitFor();
    assert.equal(await page.locator('#s04-pick').getAttribute('data-id'), id);
    report.checks.push({ name: 'Tour live input/cards/map/detail/reload', passed: true, ids: tour.body.candidates.map(c => c.id) });
    await page.evaluate(() => { location.hash = '/search'; });
    await page.locator('#culture-source').waitFor({ state: 'visible' });
    await page.locator('#culture-source').selectOption('seoul');
    await page.locator('[data-category="전시"]').click();
    const seoul = await submit(page);
    assert.equal(seoul.status, 200); assert.ok(seoul.body.candidates.length > 0);
    assert.ok(seoul.body.candidates.every(c => c.id.startsWith('seoul:')));
    assert.match(await page.locator('#s03-source').textContent(), /서울문화포털/);
    report.checks.push({ name: 'Seoul live source switch', passed: true, ids: seoul.body.candidates.map(c => c.id) });
    await page.evaluate(() => { location.hash = '/search'; });
    await page.locator('#culture-source').selectOption('tour');
    await page.route('**/preview/recommend', route => route.fulfill({ status: 502, json: { status: 'error', message: '모의 공급자 실패' } }));
    await submit(page, false);
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lab678_flow')));
    assert.deepEqual(saved.result.candidates.map(c => c.id), seoul.body.candidates.map(c => c.id));
    report.checks.push({ name: 'Mock 502 preserves previous result, no fallback', passed: true });
    await page.unroute('**/preview/recommend');
    await page.route('**/preview/recommend', route => route.fulfill({ json: { ...tour.body, status: 'no_results', candidates: [] } }));
    // Failed submit retains the confirmed request; retry directly.
    await page.locator('#btn-search').click();
    await page.waitForURL('**#/results');
    assert.equal(await page.locator('#s03-empty').isVisible(), true);
    assert.equal(await page.locator('#s03-found').isVisible(), false);
    report.checks.push({ name: 'Mock zero results distinct from failure', passed: true });
    const personal = await browser.newPage();
    await personal.goto('http://127.0.0.1:8765/checks');
    await personal.getByRole('button', { name: '나들이 찾기', exact: true }).click();
    await personal.locator('[name="culture_source"]').selectOption('tour');
    await personal.locator('[name="start"]').fill('2026-11-01T14:00');
    await personal.locator('[name="end"]').fill('2026-11-01T17:00');
    const personalResponse = personal.waitForResponse(r => r.url().endsWith('/preview/recommend'));
    await personal.getByRole('button', { name: '추천받기', exact: true }).click();
    const pr = await personalResponse;
    assert.equal(pr.status(), 200);
    await personal.locator('#list li').first().waitFor();
    assert.equal(await personal.locator('#result-title').textContent(), '주변 문화시설 추천');
    assert.match(await personal.locator('#list li').first().getAttribute('data-id'), /^tour:/);
    assert.match(await personal.locator('#list li a').first().textContent(), /문화시설 공식 홈페이지/);
    report.checks.push({ name: 'Personal preview live Tour recommendation', passed: true });
    assert.deepEqual(errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false; report.error = error.message; throw error;
  } finally {
    await fs.writeFile('.local/culture-ui/result.json', JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log('PASS culture UI: live sources, card/map/detail ID, reload, mock error and zero results');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
