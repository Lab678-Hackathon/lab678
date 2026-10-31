/** 사진으로 지정한 초기 S02 폼 복원·대화 분리·휴대폰 배치·조건 보존을 검사한다. 음성/AI는 모의다. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { devices, response } = require('./check_voice_session.cjs');
const base = process.env.LAB678_TEST_BASE || 'http://127.0.0.1:8765/app';

/** 페이지 오류와 API 횟수를 수집한다. 실제 마이크나 AI를 호출하지 않는다. */
async function ready(browser, texts = [], debug = true) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(devices, { texts });
  const stats = { calls: 0, recommend: 0, errors: [] };
  page.on('pageerror', error => stats.errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('/preview/recommend')) stats.recommend++; });
  await page.route('**/preview/chat', route => {
    stats.calls++;
    const body = route.request().postDataJSON();
    return route.fulfill({ json: response(body, { updated_condition_draft: { ...body.condition_draft,
      ...(stats.calls === 1 ? { music_followup: true } : { category: '국악', categories: ['국악'], music_followup: false, free_only: true }) } }) });
  });
  await page.goto(base + '/?' + (debug ? 'debug=1&' : '') + 'season=none#/home');
  await page.locator('#s01 #chat-mic').waitFor();
  return { page, stats };
}

/** 현재 설정 화면에 대화·진단·추가 출처 메뉴가 끼어들지 않았는지 확인한다. */
async function simple(page) {
  assert.equal(await page.locator('#s02 #dj-chat').count(), 0);
  assert.equal(await page.locator('#chat-mic').isVisible(), false);
  assert.equal(await page.locator('#culture-source').count(), 0);
  assert.equal(await page.locator('#f-place').isVisible(), true);
  assert.equal(await page.locator('#f-date').isVisible(), true);
  assert.equal(await page.locator('#f-start').isVisible(), true);
  assert.equal(await page.locator('#f-end').isVisible(), true);
  assert.equal(await page.locator('#btn-search').isVisible(), true);
}

/** 승인된 기존 두 화면만 확인하고 실제 사용자 음성 성공으로 표시하지 않는다. */
async function main() {
  await fs.mkdir('.local/voice-navigation', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { base, audio: 'mock', scope: 'restored initial S02; home-only conversation', cases: [] };
  /** 실패 원인을 보존하고 나머지 독립 경계를 확인한다. */
  async function check(name, task) {
    try { await task(); report.cases.push({ name, passed: true }); }
    catch (error) { report.cases.push({ name, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    await check('phone_home_and_original_settings_are_distinct', async () => {
      const { page, stats } = await ready(browser, [], false);
      await page.screenshot({ path: '.local/voice-navigation/home-390.png', fullPage: true });
      await page.locator('#chat-manual-entry').click();
      await page.waitForURL(/#\/search$/);
      await simple(page);
      for (const width of [320, 390, 430, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const app = await page.locator('.app').boundingBox(); assert.ok(app.width <= 390);
        if (width === 390) {
          await page.evaluate(() => scrollTo(0, 0));
          const bubble = await page.locator('#s02 .bubble').boundingBox();
          const bar = await page.locator('#s02 .bottombar').boundingBox();
          assert.ok(bubble.y + bubble.height <= bar.y + 1, 'settings text hidden under bottom button');
          await page.screenshot({ path: '.local/voice-navigation/settings-390.png', fullPage: true });
        }
      }
      assert.equal(stats.calls + stats.recommend, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('greeting_followup_need_then_initial_settings_preserves_draft', async () => {
      const { page, stats } = await ready(browser, ['음악', '국악']);
      await page.locator('#chat-mic').click();
      await page.waitForURL(/#\/search$/);
      await simple(page);
      assert.equal(await page.locator('[data-category="국악"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#chat-text').inputValue(), '국악');
      assert.equal(await page.evaluate(() => voiceTest.spoken[0]), '안녕하세요.');
      assert.equal(await page.evaluate(() => voiceTest.starts), 2);
      const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lab678_flow')));
      assert.equal(saved.chat.preferences.free_only, true);
      assert.equal(saved.form.picked, undefined);
      assert.equal(stats.calls, 2); assert.equal(stats.recommend, 0);
      await page.reload(); await page.locator('#f-place').waitFor(); await simple(page);
      assert.equal(await page.locator('[data-category="국악"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => voiceTest.starts), 0);
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('manual_transition_stops_microphone_and_rejects_late_result', async () => {
      const { page, stats } = await ready(browser);
      await page.locator('#chat-mic').click(); await page.waitForFunction(() => voiceTest.starts === 1);
      await page.locator('#chat-manual-entry').click(); await page.waitForURL(/#\/search$/);
      await page.evaluate(() => {
        const result = [{ transcript: '늦은 결과' }]; result.isFinal = true;
        voiceTest.sessions[0].handlers.result({ results: [result] });
      });
      await simple(page);
      assert.equal(await page.locator('#chat-text').inputValue(), '');
      assert.equal(await page.locator('#chat-voice-status').getAttribute('data-phase'), 'idle');
      await page.evaluate(() => { location.hash = '/home'; });
      await page.locator('#s01 #chat-mic').waitFor();
      assert.equal(await page.locator('#chat-mic').getAttribute('aria-pressed'), 'false');
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('original_settings_59_rejected_60_opens_inline_confirmation', async () => {
      const { page, stats } = await ready(browser);
      await page.locator('#chat-manual-entry').click();
      await page.locator('#qa-start').click();
      await page.locator('#f-start').fill('10:00'); await page.locator('#f-end').fill('10:59');
      await page.locator('[data-category="전시"]').click(); await page.locator('#btn-search').click();
      assert.match(await page.locator('#err-time').textContent(), /1시간/);
      await page.locator('#f-end').fill('11:00'); await page.locator('#btn-search').click();
      await page.locator('#confirm:not([hidden])').waitFor();
      assert.equal(stats.recommend, 0); await simple(page);
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('results_and_profile_have_no_injected_conversation_panel', async () => {
      const { page, stats } = await ready(browser);
      await page.evaluate(async () => {
        const { state, save } = await import('./js/state.js'); state.form.cultureSource = 'tour'; save();
      });
      for (const path of ['/results', '/me', '/search']) {
        await page.evaluate(value => { location.hash = value; }, path);
        await page.waitForURL(new RegExp('#' + path + '$'));
        assert.equal(await page.locator('#chat-mic').isVisible(), false);
        assert.equal(await page.locator('#dj-chat').count(), 1);
        assert.equal(await page.locator('#s01 #dj-chat').count(), 1);
      }
      assert.equal(await page.evaluate(async () => (await import('./js/state.js')).state.form.cultureSource), 'seoul');
      assert.deepEqual(stats.errors, []); await page.close();
    });
  } finally {
    await browser.close();
    await fs.writeFile('.local/voice-navigation/result.json', JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
