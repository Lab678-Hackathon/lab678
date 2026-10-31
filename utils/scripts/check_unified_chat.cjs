/** 8765 단일 주소에서 실제 텍스트 AI 2턴과 결과 없는 음성 종료→재시도를 구분해 확인한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { devices, response } = require('./check_voice_session.cjs');
const base = 'http://127.0.0.1:8765';

/** 버튼으로 보낸 실제 채팅 응답을 기다리고 요청 origin과 화면 응답을 확인한다. */
async function send(page, message) {
  await page.locator('#chat-text').fill(message);
  const pending = page.waitForResponse(r => r.url().endsWith('/preview/chat'));
  await page.locator('#chat-send').click();
  const result = await pending;
  assert.equal(result.url(), base + '/preview/chat');
  assert.equal(result.status(), 200);
  const body = await result.json();
  await page.waitForFunction(() => !document.querySelector('#chat-send').disabled);
  assert.equal(await page.locator('#chat-status').textContent(), body.assistant_text);
  return body;
}

/** 실제 AI와 모의 장치를 분리하고 브라우저 오류/결과를 저장한다. */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { base, cases: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/checks');
    await page.locator('#automatic-chat-entry').waitFor();
    await page.locator('#begin').click();
    assert.equal(await page.locator('#listen').textContent(), '한 번 말하기');
    await page.locator('#automatic-chat-link').click();
    await page.waitForURL(base + '/app/?#/home');
    await page.locator('#chat-mic').waitFor();
    const first = await send(page, '음악을 듣고 싶어요');
    assert.match(first.assistant_text, /음악|국악|클래식|콘서트/);
    const second = await send(page, '국악이 좋아요');
    assert.equal(await page.locator('[data-category="국악"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    await fs.mkdir('.local/unified-chat', { recursive: true });
    await page.screenshot({ path: '.local/unified-chat/text-chat.png', fullPage: true });
    report.cases.push({ name: 'old_microphone_entry_to_same_origin_real_chat_two_turns', mode: 'Naito live 2 calls; no audio', passed: true,
      assistant_texts: [first.assistant_text, second.assistant_text] });
    console.log('PASS 8765 old entry → /app/ → real AI 2 turns → category applied');
    await page.close();

    const voice = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await voice.addInitScript(devices, {});
    let calls = 0;
    await voice.route('**/preview/chat', route => {
      calls++;
      return route.fulfill({ json: response(route.request().postDataJSON(), { assistant_text: '조건을 확인해 주세요.', ready_to_search: true }) });
    });
    await voice.goto(base + '/app/?#/home');
    await voice.locator('#chat-mic').click();
    await voice.waitForFunction(() => voiceTest.starts === 1);
    await voice.evaluate(() => {
      voiceTest.texts.push('국악');
      const engine = voiceTest.sessions[0].engine;
      engine.onaudioend(); engine.onend();
    });
    await voice.waitForFunction(() => document.querySelector('#chat-voice-status').textContent.includes('인식된 문장이 없어'));
    assert.equal(calls, 0);
    await voice.waitForFunction(() => document.querySelector('#chat-voice-status').dataset.phase === 'idle');
    assert.equal(calls, 1);
    assert.equal(await voice.locator('#chat-text').inputValue(), '국악');
    report.cases.push({ name: 'audio_end_without_result_retries_then_sends_once', mode: 'mock audio/TTS/AI', passed: true });
    console.log('PASS empty recognition end → visible retry → one final transcript sent once');
    await voice.close();
  } catch (error) { report.cases.push({ name: 'failed_check', passed: false, error: error.message }); process.exitCode = 1; }
  finally {
    await browser.close();
    await fs.mkdir('.local/unified-chat', { recursive: true });
    await fs.writeFile('.local/unified-chat/result.json', JSON.stringify(report, null, 2) + '\n');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
