/** 공통 자동 대화의 첫 질문·화면 이동·현재 후보 ID·중지 경계를 검증한다.
 * 음성/TTS는 모의. --live 마지막 1구간만 실제 Naito, 나머지 AI/후보는 명시적 모의.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { devices, response } = require('./check_voice_session.cjs');
const base = process.env.LAB678_TEST_BASE || 'http://127.0.0.1:5175';

/** 가짜 장치만 새 브라우저 세션에 넣고 페이지 오류/API 호출을 수집한다. */
async function ready(browser, texts, hash = '/home', live = false) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
  await page.addInitScript(devices, { texts });
  const stats = { calls: 0, errors: [], recommend: 0 };
  page.on('pageerror', error => stats.errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('/preview/recommend')) stats.recommend++; });
  if (!live) await page.route('**/preview/chat', route => {
    stats.calls++;
    const body = route.request().postDataJSON();
    return route.fulfill({ json: response(body, { assistant_text: stats.calls === 1 ? '어떤 음악을 좋아하세요?' : '언제 출발하고 싶으세요?' }) });
  });
  await page.goto(`${base}/?debug=1&season=none#${hash}`);
  await page.locator('#chat-mic').waitFor();
  return { page, stats };
}

/** 현재 후보 두 개만 주입한다. 실제 문화데이터 호출 성공으로 간주하지 않는다. */
async function candidates(page) {
  await page.evaluate(async () => {
    const { state, save } = await import('/js/state.js');
    state.result = { status: 'ready', candidates: [
      { id: 'mock:one', title: '모의 첫 전시', venue: '모의 장소 하나', lat: 37.58, lng: 127.04, opening_info: null, price_info: null, checks_required: ['운영 확인 필요'] },
      { id: 'mock:two', title: '모의 두 번째 전시', venue: '모의 장소 둘', lat: 37.57, lng: 127.03, opening_info: '10:00~18:00', price_info: null, checks_required: [] },
    ] };
    state.shownIds = ['mock:one', 'mock:two']; save();
  });
}

/** 횟수 종료까지 기다린다. 실제 마이크/스피커 동작은 이 검증에 포함되지 않는다. */
async function runTurns(page, count) {
  await page.locator('#chat-voice-settings summary').click();
  await page.locator('#chat-max-turns').fill(String(count));
  await page.locator('#chat-mic').click();
  await page.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
}

/** 화면을 오가는 대표 시나리오와 오류 경계를 묶어서 실행한다. */
async function main() {
  await fs.mkdir('.local/voice-navigation', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { base, audio: 'mock', cases: [] };
  /** 실패한 구간도 기록하고 나머지 검증을 계속한다. */
  async function check(name, task) {
    try { await task(); report.cases.push({ name, passed: true }); }
    catch (error) { report.cases.push({ name, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    await check('home_greeting_two_turns_auto_search', async () => {
      const { page, stats } = await ready(browser, ['음악을 듣고 싶어요', '국악이 좋아요']);
      assert.equal(await page.evaluate(() => voiceTest.starts), 0);
      await runTurns(page, 2);
      assert.match(page.url(), /#\/search$/);
      assert.deepEqual(await page.evaluate(() => [voiceTest.greetings, voiceTest.starts, voiceTest.speaks]), [1, 2, 2]);
      assert.match(await page.evaluate(() => voiceTest.spoken[0]), /어떤 나들이/);
      assert.equal(stats.calls, 2); assert.equal(stats.recommend, 0);
      assert.deepEqual(stats.errors, []);
      await page.screenshot({ path: '.local/voice-navigation/automatic-chat.png', fullPage: true });
      await page.close();
    });
    await check('results_detail_read_select_back_one_session', async () => {
      const { page, stats } = await ready(browser, ['두 번째 장소 자세히 보여줘', '이 장소 읽어줘', '이 장소 선택', '추천 목록 보여줘', '조건 바꿔'], '/results');
      await candidates(page); await page.reload();
      await runTurns(page, 5);
      assert.match(page.url(), /#\/search$/);
      const values = await page.evaluate(async () => ({ selected: (await import('/js/state.js')).state.selectedId, spoken: voiceTest.spoken, count: document.querySelectorAll('#dj-chat').length }));
      assert.equal(values.selected, 'mock:two'); assert.equal(values.count, 1);
      assert.match(values.spoken[2], /모의 두 번째 전시.*가격 확인 필요/);
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('missing_candidate_and_course_do_not_navigate', async () => {
      const { page, stats } = await ready(browser, ['9번째 장소 보여줘', '길찾기 화면 보여줘']);
      await runTurns(page, 2);
      assert.match(page.url(), /#\/home$/);
      const spoken = await page.evaluate(() => voiceTest.spoken.join(' '));
      assert.match(spoken, /그 번호.*없어요/); assert.match(spoken, /아직 연결 중/);
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('detail_manual_selection_keeps_single_panel', async () => {
      const { page, stats } = await ready(browser, [], '/results');
      await candidates(page);
      await page.evaluate(() => { location.hash = '/place/mock%3Atwo'; });
      await page.locator('#s04 #chat-mic').waitFor();
      await page.locator('#s04-pick').click();
      assert.equal(await page.locator('#s04 #chat-mic').isVisible(), true);
      assert.equal(await page.locator('#dj-chat').count(), 1);
      await page.evaluate(() => { location.hash = '/me'; });
      await page.locator('#s07 #chat-mic').waitFor();
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('manual_navigation_stops_and_voice_stop_finishes', async () => {
      const { page, stats } = await ready(browser, []);
      await page.locator('#chat-mic').click(); await page.waitForFunction(() => voiceTest.starts === 1);
      await page.evaluate(() => { location.hash = '/me'; });
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
      const before = await page.evaluate(() => voiceTest.starts);
      await page.waitForTimeout(150); assert.equal(await page.evaluate(() => voiceTest.starts), before);
      await page.evaluate(() => voiceTest.texts.push('대화 중지', '국악'));
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').textContent.includes('요청하신 대화를 마쳤'));
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('spoken_conflict_decision_preserves_other_conditions', async () => {
      const { page, stats } = await ready(browser, ['변경 모두 반영']);
      await page.evaluate(async () => {
        const { state, save } = await import('/js/state.js');
        const draft = { request_kind: 'place', date: state.form.date, category: '전시' };
        state.form.category = '전시';
        state.chat.pending = { fingerprint: JSON.stringify(draft), conflicts: [{ field: 'category', before: '전시', after: '국악' }] }; save();
      });
      await page.reload();
      await runTurns(page, 1);
      assert.match(page.url(), /#\/search$/);
      assert.equal(await page.locator('[data-category="국악"]').getAttribute('aria-pressed'), 'true');
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    if (process.argv.includes('--live')) await check('real_naito_home_music_followup_mock_audio', async () => {
      const { page, stats } = await ready(browser, ['음악을 듣고 싶어요'], '/home', true);
      await runTurns(page, 1);
      assert.match(page.url(), /#\/search$/);
      assert.match(await page.locator('#chat-status').textContent(), /어떤 음악/);
      assert.deepEqual(stats.errors, []); await page.close();
    });
  } finally {
    await browser.close();
    await fs.writeFile('.local/voice-navigation/result.json', JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
