/** 기존 점검 화면에서 최신 대화 홈으로 이동해 마이크가 실제로 보이는지 확인한다. 녹음/AI 호출 없음. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

/** 별도 Chrome 창에서 주소 혼동을 재현하고 실제 링크·마이크·초기 꺼짐을 검증한다. */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:8765/');
    await page.locator('#automatic-chat-entry').waitFor();
    assert.equal(await page.locator('#automatic-chat-link').getAttribute('href'), 'http://127.0.0.1:5175/?#/home');
    await page.locator('#automatic-chat-link').click();
    await page.waitForURL('http://127.0.0.1:5175/?#/home');
    await page.locator('#s01 #chat-mic').waitFor();
    assert.equal(await page.locator('#chat-mic').isVisible(), true);
    assert.equal(await page.locator('#chat-mic svg').count(), 1);
    assert.equal(await page.locator('#chat-mic').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#chat-mic-state').textContent(), /꺼짐/);
    console.log('PASS existing preview → automatic chat home → visible microphone; no recording started');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
