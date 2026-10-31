/** 단발 직접 인식·항상 보이는 실시간 로그·원문 미포함·무결과/오류 표시를 모의 장치로 확인한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { devices, response } = require('./check_voice_session.cjs');

/** 한 페이지에서 음성 엔진을 제어하고 AI 요청/페이지 오류를 수집한다. */
async function ready(browser, config) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(devices, config);
  const stats = { ai: 0, errors: [] };
  page.on('pageerror', error => stats.errors.push(error.message));
  page.on('request', r => { if (r.url().endsWith('/preview/chat')) stats.ai++; });
  await page.goto('http://127.0.0.1:8765/');
  await page.locator('#chat-listen-once').waitFor();
  assert.equal(await page.locator('#chat-voice-log').isVisible(), true);
  return { page, stats };
}

/** 실제 소리를 쓰지 않고 이벤트 로그가 도중에도 갱신되고 종료 뒤 유지되는지 검사한다. */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { mode: 'mock STT/TTS; no real microphone or AI', cases: [] };
  /** 한 검사 실패를 보존하고 다음 오류 경계를 계속 검사한다. */
  async function check(name, task) {
    try { await task(); report.cases.push({ name, passed: true }); }
    catch (error) { report.cases.push({ name, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    await check('original_checks_one_shot_button_logs_and_transcribes', async () => {
      const { page, stats } = await ready(browser, { texts: ['국악을 듣고 싶어요'] });
      await page.goto('http://127.0.0.1:8765/checks');
      await page.locator('#begin').click();
      assert.equal(await page.locator('#voice-debug').isVisible(), true);
      await page.locator('#listen').click();
      await page.waitForFunction(() => document.querySelector('[name="note"]').value.includes('국악'));
      assert.match(await page.locator('#voice-log').inputValue(), /result.*전사/);
      assert.equal(stats.ai, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('single_direct_input_logs_result_without_tts_or_ai', async () => {
      const { page, stats } = await ready(browser, { texts: ['국악을 듣고 싶어요'] });
      assert.match(await page.locator('#chat-device-status').textContent(), /자동 확인:/);
      await page.locator('#chat-listen-once').click();
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').textContent.includes('음성 입력 10글자') || document.querySelector('#chat-voice-status').textContent.includes('글자를 받았어요'));
      assert.equal(await page.locator('#chat-text').inputValue(), '국악을 듣고 싶어요');
      const log = await page.locator('#chat-voice-log').textContent();
      assert.match(log, /start\(\).*user_activation=true/);
      assert.match(log, /audiostart/); assert.match(log, /result final_chars=/); assert.match(log, /end/);
      assert.doesNotMatch(log, /국악을 듣고 싶어요/);
      assert.equal(await page.evaluate(() => voiceTest.speaks + voiceTest.greetings), 0);
      assert.equal(stats.ai, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('live_events_visible_before_result_and_end_without_result_is_error', async () => {
      const { page, stats } = await ready(browser, {});
      await page.locator('#chat-listen-once').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      await page.evaluate(() => {
        const engine = voiceTest.sessions[0].engine;
        engine.onstart(); engine.onaudiostart(); engine.onsoundstart(); engine.onspeechstart();
      });
      assert.match(await page.locator('#chat-voice-log').textContent(), /speechstart/);
      await page.evaluate(() => {
        const engine = voiceTest.sessions[0].engine;
        engine.onspeechend(); engine.onaudioend(); engine.onend();
      });
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').textContent.includes('no-result'));
      assert.equal(await page.evaluate(() => voiceTest.starts), 1);
      assert.equal(await page.locator('#chat-voice-log').isVisible(), true);
      assert.equal(stats.ai, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('network_error_remains_visible_and_copied_log_button_exists', async () => {
      const { page, stats } = await ready(browser, { error: 'network' });
      await page.locator('#chat-listen-once').click();
      await page.waitForFunction(() => document.querySelector('#chat-voice-log').textContent.includes('error=network'));
      assert.equal(await page.locator('#chat-log-copy').isVisible(), true);
      assert.equal(await page.locator('#chat-voice-log').isVisible(), true);
      assert.equal(stats.ai, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('automatic_interim_text_updates_before_end_and_only_final_is_sent', async () => {
      const { page, stats } = await ready(browser, {});
      const messages = [];
      await page.route('**/preview/chat', route => {
        const request = route.request().postDataJSON(); messages.push(request.message);
        return route.fulfill({ json: response(request, { ready_to_search: true }) });
      });
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      assert.equal(await page.evaluate(() => voiceTest.sessions[0].engine.interimResults), true);
      for (const text of ['음악', '국악을 듣고 싶어요']) {
        await page.evaluate(value => {
          const result = [{ transcript: value }]; result.isFinal = false;
          voiceTest.sessions[0].engine.onresult({ results: [result] });
        }, text);
        assert.equal(await page.locator('#chat-live-transcript').textContent(), '듣는 중(임시): ' + text);
        assert.equal(await page.locator('#chat-text').inputValue(), '');
        assert.equal(stats.ai, 0);
      }
      await page.evaluate(() => {
        const engine = voiceTest.sessions[0].engine;
        const result = [{ transcript: '국악을 듣고 싶어요' }]; result.isFinal = true;
        engine.onresult({ results: [result] }); engine.onend();
      });
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
      assert.deepEqual(messages, ['국악을 듣고 싶어요']);
      assert.match(await page.locator('#chat-live-transcript').textContent(), /^인식 확정:/);
      assert.doesNotMatch(await page.locator('#chat-voice-log').textContent(), /국악을 듣고 싶어요/);
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('stop_during_interim_does_not_send_or_apply_late_final', async () => {
      const { page, stats } = await ready(browser, {});
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      await page.evaluate(() => {
        const result = [{ transcript: '국악' }]; result.isFinal = false;
        voiceTest.sessions[0].engine.onresult({ results: [result] });
      });
      await page.locator('#chat-mic').click();
      await page.evaluate(() => {
        const result = [{ transcript: '늦은 확정 결과' }]; result.isFinal = true;
        voiceTest.sessions[0].handlers.result({ results: [result] });
      });
      assert.equal(await page.locator('#chat-live-transcript').getAttribute('data-state'), 'cancelled');
      assert.equal(await page.locator('#chat-text').inputValue(), '');
      assert.equal(stats.ai, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
  } finally {
    await browser.close(); await fs.mkdir('.local/voice-diagnostics', { recursive: true });
    await fs.writeFile('.local/voice-diagnostics/result.json', JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
