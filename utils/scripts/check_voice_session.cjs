/** 자동 음성 대화의 횟수·침묵·TTS 순서·취소를 모의 브라우저 장치로 검사한다.
 * --live를 주면 마지막 한 사례의 AI만 실제 Naito를 사용한다. 마이크/스피커는 항상 모의다.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LAB678_TEST_BASE || 'http://127.0.0.1:5175';

/** 장치 이벤트를 통제하고 오래된 콜백도 재현한다. 실제 음성 녹음/출력은 하지 않는다. */
function devices(config) {
  const t = window.voiceTest = { starts: 0, aborts: 0, speaks: 0, greetings: 0, spoken: [], texts: [...(config.texts || [])], sessions: [], speech: null };
  window.SpeechRecognition = class {
    start() {
      t.starts++;
      const handlers = { result: this.onresult, end: this.onend, error: this.onerror, audioStart: this.onaudiostart, audioEnd: this.onaudioend };
      t.sessions.push({ engine: this, handlers });
      if (config.error) { setTimeout(() => this.onerror?.({ error: config.error }), 20); return; }
      if (!config.noAudio) setTimeout(() => this.onaudiostart?.(), 10);
      if (t.texts.length) {
        const text = t.texts.shift();
        setTimeout(() => {
          this.onspeechstart?.(); this.onspeechend?.();
          const result = [{ transcript: text }]; result.isFinal = true;
          this.onresult?.({ results: [result] }); this.onend?.();
        }, 30);
      } else if (config.noSpeech) setTimeout(() => { this.onerror?.({ error: 'no-speech' }); this.onend?.(); }, 30);
    }
    abort() { t.aborts++; }
  };
  if (config.prefixed) { window.webkitSpeechRecognition = window.SpeechRecognition; window.SpeechRecognition = undefined; }
  if (config.unsupported) { window.SpeechRecognition = window.webkitSpeechRecognition = undefined; }
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    cancel() { t.speech = null; },
    speak(speech) {
      t.spoken.push(speech.text);
      if (t.starts === 0) { t.greetings++; setTimeout(() => speech.onend?.(), 30); return; }
      t.speaks++; t.speech = speech;
      if (config.autoRead !== false) setTimeout(() => speech.onend?.(), 30);
    },
  } });
}

/** 실제 revision/초안을 유지한 모의 AI 응답. 기본은 아직 질문이 남아 있다. */
function response(request, extra = {}) {
  return { status: 'draft', base_revision: request.revision, updated_condition_draft: request.condition_draft,
    assistant_text: '어떤 음악을 좋아하세요?', conflicts: [], missing_fields: ['category'], field_errors: [],
    ready_to_search: false, requires_final_confirmation: true, ...extra };
}

/** 별도 세션에서 설정과 모의 장치를 준비한다. */
async function ready(browser, config = {}, handler) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Seoul' });
  await page.addInitScript(devices, config);
  const stats = { calls: 0, errors: [], chatUrls: [] };
  page.on('pageerror', e => stats.errors.push(e.message));
  page.on('request', request => { if (request.url().endsWith('/preview/chat')) stats.chatUrls.push(request.url()); });
  if (handler !== 'live') await page.route('**/preview/chat', route => {
    stats.calls++;
    return handler ? handler(route) : route.fulfill({ json: response(route.request().postDataJSON()) });
  });
  await page.goto(`${base}/?debug=1&season=none#/search`);
  await page.locator('#chat-mic').waitFor();
  await page.locator('#chat-voice-settings summary').click();
  await page.locator('#chat-silence-seconds').fill('5');
  await page.locator('#chat-max-turns').fill('2');
  return { page, stats };
}

/** 이벤트 후 중지 상태와 버튼 복원을 확인한다. */
async function stopped(page, pattern) {
  await page.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
  assert.match(await page.locator('#chat-voice-status').textContent(), pattern);
  assert.equal(await page.locator('#chat-mic').textContent(), '자동 음성 대화 시작');
  assert.equal(await page.locator('#chat-max-turns').isDisabled(), false);
}

/** 각 구간을 독립 실행하고 실패도 보존한다. */
async function main() {
  await fs.mkdir('.local/voice-session', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const report = { base, mode: 'mock speech/TTS and AI unless marked live', cases: [] };
  /** 검사 하나가 실패해도 원인을 보존하고 다른 종료 경계를 확인한다. */
  async function check(name, run) {
    try { await run(); report.cases.push({ name, passed: true }); }
    catch (error) { report.cases.push({ name, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    await check('prefixed_recognition_adapter_two_turns', async () => {
      const { page, stats } = await ready(browser, { prefixed: true, texts: ['음악', '국악'] });
      await page.locator('#chat-mic').click(); await stopped(page, /2회 대화를 마쳤/);
      assert.equal(stats.calls, 2); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('unsupported_recognition_preserves_text_chat', async () => {
      const { page, stats } = await ready(browser, { unsupported: true });
      await page.locator('#chat-mic').click(); await stopped(page, /이 브라우저는 음성 인식을 지원하지/);
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'idle');
      assert.equal(await page.locator('.mic-visual').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
      await page.locator('#chat-text').fill('전시를 보고 싶어요');
      await page.locator('#chat-send').click();
      await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
      assert.equal(stats.calls, 1); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('audio_events_control_wave_and_reduced_motion', async () => {
      const { page, stats } = await ready(browser, { noAudio: true });
      await page.evaluate(() => { location.hash = '/home'; });
      await page.locator('#s01 #chat-mic').waitFor();
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'starting');
      assert.equal(await page.locator('.mic-visual').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
      await page.evaluate(() => voiceTest.sessions[0].engine.onaudiostart());
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'listening');
      assert.equal(await page.locator('.mic-visual').evaluate(el => getComputedStyle(el, '::before').animationName), 'lab678-mic-ripple');
      await page.setViewportSize({ width: 320, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#dj-chat').screenshot({ path: '.local/voice-session/microphone-wave.png', animations: 'allow' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.mic-visual').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
      assert.match(await page.locator('#chat-mic-state').textContent(), /듣는 중/);
      await page.evaluate(() => voiceTest.sessions[0].engine.onaudioend());
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'starting');
      await page.locator('#chat-mic').click();
      await page.evaluate(() => voiceTest.sessions[0].handlers.audioStart());
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'idle');
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('same_mic_button_toggle_off_and_restart', async () => {
      const { page, stats } = await ready(browser);
      assert.equal(await page.locator('#chat-mic').isEnabled(), true);
      assert.equal(await page.locator('#chat-mic').getAttribute('aria-pressed'), 'false');
      assert.match(await page.locator('#chat-mic-state').textContent(), /꺼짐/);
      assert.equal(await page.locator('#chat-mic svg').count(), 1);
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => document.querySelector('#chat-mic').dataset.phase === 'listening');
      assert.equal(await page.locator('#chat-mic').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('#chat-mic-state').textContent(), /켜짐.*듣는 중/);
      assert.equal(await page.locator('#chat-mic').isEnabled(), true);
      await page.locator('#dj-chat').screenshot({ path: '.local/voice-session/microphone-on.png' });
      await page.locator('#chat-mic').click();
      await stopped(page, /멈췄/);
      assert.equal(await page.locator('#chat-mic').getAttribute('aria-pressed'), 'false');
      assert.match(await page.locator('#chat-mic-state').textContent(), /꺼짐/);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => voiceTest.starts), 1);
      await page.locator('#dj-chat').screenshot({ path: '.local/voice-session/microphone-off.png' });
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 2);
      await page.locator('#chat-mic').click(); await stopped(page, /멈췄/);
      assert.equal(stats.calls, 0); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('two_turns_one_click_and_settings_restore', async () => {
      const { page, stats } = await ready(browser, { texts: ['음악', '국악'] });
      await page.locator('#chat-mic').click();
      await stopped(page, /2회 대화를 마쳤/);
      assert.equal(stats.calls, 2);
      assert.deepEqual(stats.chatUrls, [base + '/preview/chat', base + '/preview/chat']);
      assert.deepEqual(await page.evaluate(() => [voiceTest.starts, voiceTest.speaks]), [2, 2]);
      await page.screenshot({ path: '.local/voice-session/settings.png', fullPage: true });
      await page.reload(); await page.locator('#chat-mic').waitFor();
      assert.equal(await page.locator('#chat-max-turns').inputValue(), '2');
      assert.equal(await page.locator('#chat-silence-seconds').inputValue(), '5');
      assert.equal(await page.evaluate(() => voiceTest.starts), 0);
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('no_speech_timeout_no_api_calls', async () => {
      const { page, stats } = await ready(browser, { noSpeech: true });
      await page.locator('#chat-mic').click();
      await stopped(page, /5초 동안 답변이 없어/);
      assert.equal(stats.calls, 0);
      const count = await page.evaluate(() => voiceTest.starts);
      await page.waitForTimeout(650);
      assert.equal(await page.evaluate(() => voiceTest.starts), count);
      assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('tts_excluded_from_silence_and_no_mic_overlap', async () => {
      const { page, stats } = await ready(browser, { texts: ['음악'], autoRead: false });
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.speaks === 1);
      assert.equal(await page.locator('#chat-mic').getAttribute('data-phase'), 'speaking');
      assert.equal(await page.locator('.mic-visual').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
      await page.waitForTimeout(5200);
      assert.equal(await page.locator('#chat-voice-status').getAttribute('data-phase'), 'speaking');
      assert.equal(await page.evaluate(() => voiceTest.starts), 1);
      await page.evaluate(() => voiceTest.speech.onend());
      await page.waitForFunction(() => voiceTest.starts === 2);
      await page.locator('#chat-voice-stop').click();
      await stopped(page, /멈췄/); assert.equal(stats.calls, 1); await page.close();
    });
    await check('stop_rejects_late_recognition', async () => {
      const { page, stats } = await ready(browser);
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      await page.locator('#chat-voice-stop').click();
      await page.evaluate(() => {
        const h = voiceTest.sessions[0].handlers, result = [{ transcript: '늦은 국악' }]; result.isFinal = true;
        h.result({ results: [result] }); h.end();
      });
      assert.equal(stats.calls, 0); assert.equal(await page.locator('#chat-text').inputValue(), '');
      await stopped(page, /멈췄/); assert.deepEqual(stats.errors, []); await page.close();
    });
    await check('stop_rejects_late_api', async () => {
      let capture; const pending = new Promise(resolve => { capture = resolve; });
      const { page } = await ready(browser, { texts: ['국악'] }, route => capture(route));
      await page.locator('#chat-mic').click(); const route = await pending;
      assert.equal(await page.locator('#chat-mic').isEnabled(), true);
      await page.locator('#chat-mic').click();
      await route.fulfill({ json: response(route.request().postDataJSON(), { updated_condition_draft: { category: '국악' } }) }).catch(() => {});
      await stopped(page, /멈췄/);
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-category="국악"]').getAttribute('aria-pressed'), 'false');
      assert.equal(await page.evaluate(() => voiceTest.speaks), 0); await page.close();
    });
    await check('network_error_stops_without_retries', async () => {
      const { page, stats } = await ready(browser, { error: 'network' });
      await page.locator('#chat-mic').click(); await stopped(page, /network/);
      assert.equal(stats.calls, 0); assert.equal(await page.evaluate(() => voiceTest.starts), 1); await page.close();
    });
    await check('api_failure_stops_and_preserves_input', async () => {
      const { page, stats } = await ready(browser, { texts: ['국악'] }, route => route.fulfill({ status: 502, json: { message: '모의 AI 실패' } }));
      await page.locator('#chat-mic').click(); await stopped(page, /응답을 확인하지 못해/);
      assert.equal(stats.calls, 1); assert.equal(await page.locator('#chat-text').inputValue(), '국악'); await page.close();
    });
    await check('ready_stops_before_limit_no_auto_recommend', async () => {
      const { page, stats } = await ready(browser, { texts: ['국악', '추가'] }, route => route.fulfill({ json: response(route.request().postDataJSON(), { ready_to_search: true }) }));
      let searches = 0; page.on('request', r => { if (r.url().endsWith('/preview/recommend')) searches++; });
      await page.locator('#chat-mic').click(); await stopped(page, /조건이 준비/);
      assert.equal(stats.calls, 1); assert.equal(searches, 0); await page.close();
    });
    await check('navigation_and_manual_input_stop', async () => {
      const { page, stats } = await ready(browser);
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      await page.locator('#chat-text').fill('직접 입력'); await stopped(page, /멈췄/);
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 2);
      await page.evaluate(() => { location.hash = '/home'; });
      await page.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
      assert.equal(stats.calls, 0); assert.equal(await page.evaluate(() => voiceTest.aborts), 2); await page.close();
    });
    await check('confirmation_and_place_selection_pause', async () => {
      for (const kind of ['conflict', 'place']) {
        const { page, stats } = await ready(browser, { texts: ['변경', '추가'] }, route => {
          const request = route.request().postDataJSON();
          const extra = kind === 'conflict' ? { conflicts: [{ field: 'category', before: '전시', after: '국악' }] }
            : { updated_condition_draft: { ...request.condition_draft, start_query: '청량리역' } };
          return route.fulfill({ json: response(request, extra) });
        });
        await page.route('**/preview/places', route => route.fulfill({ json: { status: 'no_results', places: [] } }));
        await page.locator('#chat-mic').click();
        await stopped(page, kind === 'conflict' ? /변경할 조건/ : /출발지 검색 결과/);
        assert.equal(stats.calls, 1);
        if (kind === 'conflict') assert.equal(await page.locator('#chat-conflicts').isVisible(), true);
        await page.close();
      }
    });
    await check('stop_during_tts_late_end_cannot_reopen_mic', async () => {
      const { page, stats } = await ready(browser, { texts: ['음악', '국악'], autoRead: false });
      await page.locator('#chat-mic').click(); await page.waitForFunction(() => voiceTest.speaks === 1);
      await page.evaluate(() => { window.lateTtsEnd = voiceTest.speech.onend; });
      await page.locator('#chat-mic').click();
      await page.evaluate(() => window.lateTtsEnd());
      await stopped(page, /멈췄/); assert.equal(await page.evaluate(() => voiceTest.starts), 1);
      assert.equal(stats.calls, 1); await page.close();
    });
    await check('invalid_settings_do_not_start_microphone', async () => {
      const { page, stats } = await ready(browser);
      await page.locator('#chat-max-turns').fill('11');
      await page.locator('#chat-mic').click();
      assert.match(await page.locator('#chat-voice-status').textContent(), /1~10회/);
      await page.locator('#chat-max-turns').fill('2');
      await page.locator('#chat-silence-seconds').fill('4');
      await page.locator('#chat-mic').click();
      assert.equal(await page.evaluate(() => voiceTest.starts), 0); assert.equal(stats.calls, 0); await page.close();
    });
    if (process.argv.includes('--live')) await check('real_naito_one_turn_mock_audio', async () => {
      const { page, stats } = await ready(browser, { texts: ['음악을 듣고 싶어요'] }, 'live');
      await page.locator('#chat-max-turns').fill('1');
      await page.locator('#chat-mic').click();
      await stopped(page, /1회 대화를 마쳤/);
      assert.match(await page.locator('#chat-status').textContent(), /어떤 음악/);
      assert.deepEqual(stats.errors, []); await page.close();
    });
  } finally {
    await browser.close();
    await fs.writeFile('.local/voice-session/result.json', JSON.stringify(report, null, 2));
  }
  if (report.cases.some(c => !c.passed)) process.exitCode = 1;
}
module.exports = { devices, response };
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
