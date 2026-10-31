/** 실제 Web Audio 분석기를 합성 입력으로 검사한다. 물리 마이크/사용자 음성을 녹음하거나 AI를 호출하지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { devices } = require('./check_voice_session.cjs');

/** getUserMedia만 합성 오디오 트랙으로 바꾸고 실제 AudioContext/AnalyserNode는 그대로 사용한다. */
function syntheticInput(mode) {
  const fixture = window.meterFixture = { calls: 0, tracks: [], resolve: null, gain: null };
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
    fixture.calls++;
    if (mode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
    const context = new AudioContext(); await context.resume();
    const oscillator = context.createOscillator(); oscillator.frequency.value = 440;
    const gain = context.createGain(); gain.gain.value = 0.2; fixture.gain = gain;
    const destination = context.createMediaStreamDestination();
    oscillator.connect(gain); gain.connect(destination); oscillator.start();
    fixture.tracks.push(...destination.stream.getTracks());
    if (mode === 'delayed') await new Promise(resolve => { fixture.resolve = resolve; });
    return destination.stream;
  } });
}

/** 별도 페이지에 합성 장치를 설치하고 앱/개발 점검 중 하나를 연다. */
async function ready(browser, mode = 'tone', checks = false) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(devices, { realMeter: true });
  await page.addInitScript(syntheticInput, mode);
  await page.goto('http://127.0.0.1:8765/' + (checks ? 'checks' : ''));
  if (checks) { await page.locator('#begin').click(); await page.locator('#preview-diagnostics > summary').click(); }
  else await page.locator('#chat-diagnostics > summary').click();
  const meter = page.locator(checks ? '#preview-mic-meter' : '#chat-mic-meter');
  await meter.locator('.meter-test').waitFor();
  return { page, meter, errors };
}

/** 신호·무음·중지·권한·늦은 결과·자동대화 생명주기를 각각 확인한다. */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { input: 'synthetic 440Hz; native Web Audio analyser; mock STT/TTS', cases: [] };
  await fs.mkdir('.local/microphone-meter', { recursive: true });
  /** 실패 구간도 기록하고 다음 경계를 계속 검사한다. */
  async function check(name, task) {
    try { await task(); report.cases.push({ name, passed: true }); }
    catch (error) { report.cases.push({ name, passed: false, error: error.message }); }
    console.log(`${name}: ${report.cases.at(-1).passed ? 'PASS' : 'FAIL'}`);
  }
  try {
    for (const checks of [false, true]) await check(checks ? 'checks_meter_signal_silence_stop' : 'home_meter_signal_silence_stop', async () => {
      const { page, meter, errors } = await ready(browser, 'tone', checks);
      await meter.locator('.meter-test').click();
      await page.waitForFunction(id => Number(document.querySelector(id + ' [role="meter"]').getAttribute('aria-valuenow')) > 20, checks ? '#preview-mic-meter' : '#chat-mic-meter');
      const level = Number(await meter.locator('[role="meter"]').getAttribute('aria-valuenow'));
      assert.ok(level <= 100);
      await page.waitForFunction(id => Number(document.querySelector(id).dataset.waveSamples) >= 3, checks ? '#preview-mic-meter' : '#chat-mic-meter');
      await page.setViewportSize({ width: 320, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await meter.screenshot({ path: `.local/microphone-meter/${checks ? 'checks' : 'home'}-signal.png` });
      await page.evaluate(() => { meterFixture.gain.gain.value = 0; });
      await page.waitForFunction(id => document.querySelector(id + ' [role="meter"]').getAttribute('aria-valuenow') === '0', checks ? '#preview-mic-meter' : '#chat-mic-meter');
      await meter.locator('.meter-test').click();
      const stoppedWave = await meter.locator('.meter-wave').evaluate(canvas => canvas.toDataURL());
      await page.waitForTimeout(250);
      assert.equal(await meter.locator('.meter-wave').evaluate(canvas => canvas.toDataURL()), stoppedWave);
      assert.equal(await page.evaluate(() => meterFixture.tracks.every(track => track.readyState === 'ended')), true);
      assert.deepEqual(errors, []); await page.close();
    });
    await check('voice_recognition_has_no_parallel_meter_capture', async () => {
      const { page, meter, errors } = await ready(browser);
      await meter.locator('.meter-test').click();
      await page.waitForFunction(() => Number(document.querySelector('#chat-mic-meter [role="meter"]').getAttribute('aria-valuenow')) > 20);
      const calls = await page.evaluate(() => meterFixture.calls);
      await page.locator('#chat-mic').click();
      await page.waitForFunction(() => voiceTest.starts === 1);
      assert.match(page.url(), /#\/home$/);
      assert.equal(await page.evaluate(() => meterFixture.calls), calls);
      assert.equal(await page.evaluate(() => meterFixture.tracks.every(track => track.readyState === 'ended')), true);
      assert.equal(await meter.locator('.meter-test').isDisabled(), true);
      await page.locator('#chat-mic').click();
      assert.equal(await page.evaluate(() => meterFixture.tracks.every(track => track.readyState === 'ended')), true);
      assert.equal(await meter.locator('[role="meter"]').getAttribute('aria-valuenow'), '0');
      assert.deepEqual(errors, []); await page.close();
    });
    await check('background_baseline_and_louder_signal_difference', async () => {
      const { page, meter, errors } = await ready(browser);
      await meter.locator('.meter-test').click();
      await page.waitForFunction(() => Number(document.querySelector('#chat-mic-meter [role="meter"]').getAttribute('aria-valuenow')) > 20);
      await meter.locator('.meter-calibrate').click();
      await page.waitForFunction(() => document.querySelector('#chat-mic-meter .meter-comparison').textContent.includes('배경 -17'));
      await page.evaluate(() => { meterFixture.gain.gain.value = 0.5; });
      await page.waitForFunction(() => /기준 대비 \+[6-9] dB/.test(document.querySelector('#chat-mic-meter .meter-comparison').textContent));
      assert.deepEqual(errors, []); await page.close();
    });
    await check('denied_input_shows_error_without_fake_level', async () => {
      const { page, meter, errors } = await ready(browser, 'denied');
      await meter.locator('.meter-test').click();
      await page.waitForFunction(() => document.querySelector('#chat-mic-meter').dataset.state === 'error');
      assert.match(await meter.locator('.meter-status').textContent(), /권한이 거절/);
      assert.equal(await meter.locator('[role="meter"]').getAttribute('aria-valuenow'), '0');
      assert.deepEqual(errors, []); await page.close();
    });
    await check('late_microphone_permission_after_stop_cannot_restart', async () => {
      const { page, meter, errors } = await ready(browser, 'delayed');
      await meter.locator('.meter-test').click();
      await page.waitForFunction(() => typeof meterFixture.resolve === 'function');
      await meter.locator('.meter-test').click();
      await page.evaluate(() => meterFixture.resolve());
      await page.waitForFunction(() => meterFixture.tracks.every(track => track.readyState === 'ended'));
      assert.equal(await meter.getAttribute('data-state'), 'stopped');
      assert.deepEqual(errors, []); await page.close();
    });
  } finally {
    await browser.close();
    await fs.writeFile('.local/microphone-meter/result.json', JSON.stringify(report, null, 2) + '\n');
  }
  if (report.cases.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
