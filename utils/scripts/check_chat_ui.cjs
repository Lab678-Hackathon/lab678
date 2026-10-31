/** 격리된 팀 화면에서 대화→동의/거절→조건확인→추천을 검증한다.
 * 실행: node utils/scripts/check_chat_ui.cjs (PLAYWRIGHT_MODULE 선택).
 * Naito 실제3회·recorded 추천을 사용하고, 오류/지연/STT는 명시적으로 모의한다.
 * 결과와 캡처: .local/chat-ui/. 사용자 브라우저 세션을 사용하지 않는다.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5174';
const output = path.resolve(__dirname, '../../.local/chat-ui');
const report = { front_ref: '164cd40', cases: [] };
let browser;

/** 새로운 검증 세션에서 기본 QA 조건을 채운다. */
async function pageReady(setup) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
  if (setup) await setup(page);
  await page.goto(`${base}/?mode=recorded&debug=1&season=none#/search`);
  await page.locator('#chat-text').waitFor();
  await page.locator('[data-start-key="qa"]').click();
  await page.locator('#f-date').fill('2026-10-31');
  await page.locator('#f-start').fill('14:00');
  await page.locator('#f-end').fill('17:00');
  await page.locator('[data-category="전시"]').click();
  return page;
}

/** UI에서 입력 후 API 응답과 처리 완료를 기다린다. */
async function send(page, message) {
  await page.locator('#chat-text').fill(message);
  const response = page.waitForResponse(r => r.url().endsWith('/preview/chat'));
  await page.locator('#chat-send').click();
  const body = await (await response).json();
  await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
  return body;
}

/** 모의 응답도 실제 요청 revision/초안을 사용해 늦은 값 검증을 유지한다. */
function mockBody(request, changes = {}, conflicts = []) {
  return { status: conflicts.length ? 'needs_confirmation' : 'draft', base_revision: request.revision,
    updated_condition_draft: { ...request.condition_draft, ...changes }, conflicts,
    assistant_text: '모의 응답으로 조건을 확인합니다.', missing_fields: [], field_errors: [],
    ready_to_search: !conflicts.length, requires_final_confirmation: true };
}

/** 한 사례가 실패해도 다른 구간의 검증 결과를 수집한다. */
async function check(name, mode, task) {
  try { report.cases.push({ name, mode, status: 'PASS', ...await task() }); }
  catch (error) { report.cases.push({ name, mode, status: 'FAIL', error: error.message }); }
  console.log(`${name}: ${report.cases.at(-1).status}`);
}

/** 독립 브라우저에서 실제 연결과 모의 예외를 구분하여 검증한다. */
async function main() {
  await fs.mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    await check('live_chat_to_recorded_recommendation', 'Naito live 3 calls; recommendation recorded', async () => {
      const page = await pageReady();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.locator('#f-start').fill(''); await page.locator('#f-end').fill('');
      let body = await send(page, '오후 2시부터 오후 5시까지 나들이하고 싶어요');
      assert.equal(await page.locator('#f-start').inputValue(), '14:00');
      assert.equal(await page.locator('#f-end').inputValue(), '17:00');
      assert.equal(await page.locator('#f-date').inputValue(), '2026-10-31');
      body = await send(page, '국악을 듣고 싶어요');
      assert.ok(body.conflicts.some(c => c.field === 'category' && c.after === '국악'));
      assert.equal(await page.locator('[data-category="전시"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#btn-search').isDisabled(), true);
      await page.screenshot({ path: path.join(output, 'chat-conflict.png'), fullPage: true });
      await page.getByRole('button', { name: '기존 조건 유지', exact: true }).click();
      body = await send(page, '출발 시각을 같은 날 오후 3시로 바꿔 주세요');
      assert.ok(body.conflicts.some(c => c.field === 'start_at'));
      await page.getByRole('button', { name: '변경 모두 반영', exact: true }).click();
      assert.equal(await page.locator('#f-start').inputValue(), '15:00');
      await page.locator('#btn-search').click();
      await page.locator('#confirm').waitFor({ state: 'visible' });
      const response = page.waitForResponse(r => r.url().endsWith('/preview/recommend'));
      await page.locator('#btn-search').click();
      const r = await response;
      assert.equal(r.status(), 200);
      const data = await r.json();
      assert.equal(r.request().postDataJSON().start_at, '2026-10-31T15:00:00+09:00');
      await page.waitForURL('**#/results');
      await page.locator('#s03-list .place-card').first().getByRole('button', { name: '자세히 보기' }).click();
      await page.locator('#s04-pick').waitFor();
      assert.equal(await page.locator('#s04-pick').getAttribute('data-id'), data.candidates[0].id);
      await page.screenshot({ path: path.join(output, 'chat-to-detail.png'), fullPage: true });
      assert.deepEqual(errors, []);
      const id = data.candidates[0].id;
      await page.close();
      return { selected_detail_id: id, runtime_errors: errors };
    });
    await check('stale_response_preserves_manual_change', 'mock delayed API', async () => {
      let resolveRequest; const captured = new Promise(resolve => { resolveRequest = resolve; });
      const page = await pageReady(async p => p.route('**/preview/chat', route => resolveRequest(route)));
      await page.locator('#chat-text').fill('시간 변경'); await page.locator('#chat-send').click();
      const route = await captured;
      await page.locator('#f-end').fill('18:00'); await page.locator('#f-start').click();
      const body = mockBody(route.request().postDataJSON(), { end_at: '2026-10-31T16:00:00+09:00' });
      await route.fulfill({ json: body }).catch(() => {});
      await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
      assert.equal(await page.locator('#f-end').inputValue(), '18:00');
      assert.equal(await page.locator('#chat-conflicts').isHidden(), true);
      await page.close(); return {};
    });
    await check('failure_preserves_conditions_and_history', 'mock 502', async () => {
      const page = await pageReady(async p => p.route('**/preview/chat', route => route.fulfill({ status: 502, json: { message: '검증용 AI 연결 실패' } })));
      await send(page, '국악을 듣고 싶어요');
      assert.equal(await page.locator('#f-start').inputValue(), '14:00');
      assert.equal(await page.locator('[data-category="전시"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('#chat-status').textContent(), /실패/);
      await page.reload(); await page.locator('#chat-text').waitFor();
      assert.equal(await page.locator('#chat-text').inputValue(), '국악을 듣고 싶어요');
      assert.match(await page.locator('#chat-history').textContent(), /검증용 AI 연결 실패/);
      await page.close(); return {};
    });
    await check('origin_change_requires_fresh_selection', 'mock chat and no-result place search', async () => {
      const page = await pageReady(async p => {
        await p.route('**/preview/chat', route => {
          const request = route.request().postDataJSON();
          return route.fulfill({ json: mockBody(request, {}, [{ field: 'start_query', before: request.condition_draft.start_location, after: '서울역' }]) });
        });
        await p.route('**/preview/places', route => route.fulfill({ json: { status: 'no_results', places: [] } }));
      });
      await send(page, '서울역에서 출발할래');
      await page.getByRole('button', { name: '변경 모두 반영', exact: true }).click();
      assert.equal(await page.locator('#f-place').inputValue(), '서울역');
      assert.equal(await page.locator('#start-selected').isHidden(), true);
      await page.locator('#btn-search').click();
      assert.equal(await page.locator('#confirm').isHidden(), true);
      assert.match(await page.locator('#err-start').textContent(), /출발지/);
      await page.close(); return {};
    });
    await check('speech_final_auto_sends_once', 'mock speech engine and chat', async () => {
      let calls = 0;
      const page = await pageReady(async p => {
        await p.addInitScript(() => {
          window.SpeechRecognition = class {
            start() { queueMicrotask(() => { const result = [{ transcript: '국악을 듣고 싶어요' }]; result.isFinal = true; this.onresult({ results: [result] }); this.onend(); }); }
            stop() {} abort() {}
          };
        });
        await p.route('**/preview/chat', route => { ++calls; return route.fulfill({ json: mockBody(route.request().postDataJSON()) }); });
      });
      const response = page.waitForResponse(r => r.url().endsWith('/preview/chat'));
      await page.locator('#chat-mic').click(); await response;
      await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
      assert.equal(calls, 1);
      assert.equal(await page.locator('#chat-text').inputValue(), '국악을 듣고 싶어요');
      await page.close(); return { api_calls: calls, real_microphone_tested: false };
    });
  } finally {
    await browser.close();
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => item.status === 'FAIL')) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
