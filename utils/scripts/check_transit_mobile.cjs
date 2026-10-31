/** 모바일 경로 카드의 실제 응답 재생·실호출·누락·오류·텍스트/지도 전환을 검사한다.
 * 실행 전 check_transit_details.py로 공개 QA 경로 응답을 준비한다. --live는 실제 서버 실조회1회 추가.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:8765';
const origin = { label: '청량리역', lat: 37.5805961, lng: 127.0482573 };
const destination = { venue: '서울돈화문국악당', lat: 37.57725, lng: 126.99073 };

/** 독립 창에서 지도는 Leaflet으로 고정하고 실제/재생 대중교통만 구분한다. */
async function ready(browser, width, response) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/map-config', route => route.fulfill({ json: { provider: 'leaflet', javascript_key: '' } }));
  if (response) await page.route('**/preview/transit', route => route.fulfill({ json: response }));
  await page.goto(base);
  return { page, errors };
}

/** 기존 경로 버튼의 함수로 같은 공개 출발·도착을 열어 전체 렌더링을 확인한다. */
async function open(page) {
  await page.evaluate(async ({ origin, destination }) => { await openTransit(origin, destination); }, { origin, destination });
  await page.locator('#route-content').waitFor();
}

/** 320px부터 가로 넘침, 글씨/버튼 크기, 큰 노선과 승하차 필드를 검증한다. */
async function inspect(page, body) {
  assert.equal(await page.locator('.transit-card').count(), body.routes[0].steps.length);
  assert.equal(await page.locator('.transit-card .transit-stops').count(), body.routes[0].steps.filter(s => s.mode !== 'WALKING').length);
  const size = await page.evaluate(() => ({
    title: parseFloat(getComputedStyle(document.querySelector('.transit-line')).fontSize),
    text: parseFloat(getComputedStyle(document.querySelector('.transit-guidance')).fontSize),
    dialogFits: document.querySelector('#route-dialog').scrollWidth <= document.querySelector('#route-dialog').clientWidth,
    pageFits: document.documentElement.scrollWidth <= innerWidth,
    buttons: [...document.querySelectorAll('#route-dialog button')].filter(b => b.getClientRects().length).every(b => b.getBoundingClientRect().height >= 44),
  }));
  assert.ok(size.title >= 24 && size.text >= 18);
  assert.equal(size.dialogFits, true); assert.equal(size.pageFits, true); assert.equal(size.buttons, true);
  const lineNames = body.routes[0].steps.flatMap(s => (s.vehicles || []).map(v => v.name));
  for (const name of lineNames) assert.match(await page.locator('#route-steps').textContent(), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

/** 실제 API와 모의 경계를 분리해 기록하며 화면 실패도 보존한다. */
async function main() {
  const actual = JSON.parse(await fs.readFile('.local/transit-details/live-api.json', 'utf8')).response;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { base, cases: [] };
  /** 각 구간의 결과를 모아서 보고한다. */
  async function check(name, mode, task) {
    try { await task(); report.cases.push({ name, mode, passed: true }); }
    catch (error) { report.cases.push({ name, mode, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    for (const width of [320, 390, 768]) await check(`mobile_${width}_lines_stops_and_map`, 'real API response replay', async () => {
      const { page, errors } = await ready(browser, width, actual);
      await open(page); await inspect(page, actual);
      await page.locator('#transit-choices button').last().click();
      assert.match(await page.locator('.transit-line').first().textContent(), /272/);
      const geometry = actual.routes.at(-1).steps.some(s => s.path?.length >= 2);
      if (geometry) {
        await page.locator('.transit-map-button').first().click();
        await page.locator('#route-map path.leaflet-interactive').first().waitFor();
        await page.locator('#route-text').click();
        assert.equal(await page.locator('#route-steps').isVisible(), true);
      }
      if (width === 390) {
        await page.locator('#route-summary').scrollIntoViewIfNeeded();
        await page.locator('#route-dialog').screenshot({ path: '.local/transit-details/mobile-route.png' });
        await page.locator('.transit-card').first().scrollIntoViewIfNeeded();
        await page.locator('#route-dialog').screenshot({ path: '.local/transit-details/mobile-card.png' });
      }
      assert.deepEqual(errors, []); await page.close();
    });
    await check('missing_metadata_and_html_stay_plaintext', 'mock altered optional fields', async () => {
      const body = structuredClone(actual);
      const step = body.routes[0].steps.find(s => s.mode !== 'WALKING');
      step.vehicles = []; step.boarding_stop = step.alighting_stop = null;
      const { page, errors } = await ready(browser, 320, body);
      await open(page);
      assert.match(await page.locator('#route-steps').textContent(), /노선 정보 확인 필요.*정류장·역 확인 필요/s);
      await page.locator('#route-close').click();
      await page.unroute('**/preview/transit');
      step.vehicles = [{ name: '<img src=x onerror=alert(1)>', type: null }];
      await page.route('**/preview/transit', route => route.fulfill({ json: body }));
      await open(page);
      assert.equal(await page.locator('#route-steps img').count(), 0);
      assert.match(await page.locator('.transit-line').first().textContent(), /<img/);
      assert.deepEqual(errors, []); await page.close();
    });
    await check('provider_failure_and_closed_dialog_do_not_show_stale_routes', 'mock 502 and delayed response', async () => {
      const { page, errors } = await ready(browser, 390, null);
      await page.route('**/preview/transit', route => route.fulfill({ status: 502, json: { status: 'unavailable', message: '모의 조회 실패' } }));
      await page.evaluate(async ({ origin, destination }) => { await openTransit(origin, destination); }, { origin, destination });
      assert.equal(await page.locator('#route-content').isVisible(), false);
      assert.match(await page.locator('#route-status').textContent(), /모의 조회 실패/);
      await page.locator('#route-close').click(); await page.unroute('**/preview/transit');
      let pending; const captured = new Promise(resolve => { pending = resolve; });
      await page.route('**/preview/transit', route => pending(route));
      await page.evaluate(({ origin, destination }) => { void openTransit(origin, destination); }, { origin, destination });
      const request = await captured; await page.locator('#route-close').click();
      await request.fulfill({ json: actual }).catch(() => {});
      assert.equal(await page.locator('#route-dialog').isVisible(), false);
      assert.equal(await page.locator('#route-steps li').count(), 0);
      assert.deepEqual(errors, []); await page.close();
    });
    if (process.argv.includes('--live')) await check('live_api_lines_stops_to_mobile_cards', 'live Kakao API through app backend', async () => {
      const { page, errors } = await ready(browser, 390, null);
      const pending = page.waitForResponse(r => r.url().endsWith('/preview/transit'));
      await open(page);
      const response = await pending; assert.equal(response.status(), 200);
      const body = await response.json(); await inspect(page, body);
      await fs.writeFile('.local/transit-details/live-ui-response.json', JSON.stringify(body, null, 2) + '\n');
      assert.deepEqual(errors, []); await page.close();
    });
  } finally {
    await browser.close();
    await fs.writeFile('.local/transit-details/ui-checks.json', JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
