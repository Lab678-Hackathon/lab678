/** 로컬 점검 서버와 설치된 Playwright/Chromium으로 실제 조회·선택·조건 복귀를 검증한다.
 * 환경 변수 PLAYWRIGHT_MODULE과 CHROMIUM_PATH는 번들 런타임을 사용할 때만 지정한다.
 * 실행: node utils/scripts/check_outing_ui.cjs (서버를 먼저 시작한다).
 */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 독립 브라우저 컨텍스트로 한국어 추천 폼 왕복과 공급자 장애 표시를 검사한다. */
async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, headless: true});
  try {
    const page = await browser.newPage({viewport: {width:390,height:844}});
    await page.goto("http://127.0.0.1:8765");
    await page.getByRole("button",{name:"나들이 찾기"}).click();
    assert.equal(await page.locator("#coords").getAttribute("open"), null);
    const submit = page.getByRole("button",{name:"추천받기"});
    await page.locator('[name="mode"]').selectOption("recorded");
    await submit.click();
    await page.locator("#list li").first().waitFor();
    assert.equal(await page.locator("#list li").count(), 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator("#list").evaluate(el => el.scrollWidth > el.clientWidth), true);
    await page.getByRole("button",{name:"다음 행사"}).click();
    assert.equal(await page.locator("#selection").getAttribute("data-id"), await page.locator("#list li").nth(1).getAttribute("data-id"));
    await page.getByRole("button",{name:"이전 행사"}).click();
    await page.getByRole("button",{name:"이 행사 선택"}).first().click();
    const pins = page.locator("#map .event-pin");
    await pins.first().waitFor();
    assert.equal(await pins.count(), 5);
    assert.equal(await pins.first().evaluate(el => el.classList.contains("active")), true);
    await pins.nth(1).click();
    assert.equal(await page.locator("#selection").getAttribute("data-id"), await page.locator("#list li").nth(1).getAttribute("data-id"));
    assert.equal(await page.locator("#list li").nth(1).getAttribute("aria-current"), "true");
    await page.waitForFunction(() => [...document.querySelectorAll(".leaflet-tile-loaded")].some(tile => tile.naturalWidth > 0));
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    assert.equal(await page.locator('[name="label"]').inputValue(), "청량리역");
    await page.locator('[name="category"]').selectOption("전체");
    await submit.click();
    await page.getByText("소리: 성덕대왕신종",{exact:false}).first().waitFor();
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    await page.locator('[name="mode"]').selectOption("live");
    await page.locator('[name="category"]').selectOption("전시");
    await submit.click();
    await page.locator("#list li").first().waitFor();
    assert.match(await page.locator("#status").textContent(), /실시간/);
    console.log(await page.locator("#status").textContent());
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    await page.route("**/preview/recommend", route => route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({status:"error",message:"조회 실패 검증"})}));
    await submit.click();
    await page.getByText("조회 실패 검증",{exact:true}).waitFor();
    assert.equal(await submit.isVisible(), true);
    await page.unroute("**/preview/recommend");
    await page.route("**/leaflet.js", route => route.abort());
    await page.reload();
    await page.getByRole("button",{name:"나들이 찾기"}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await submit.click();
    await page.getByText("지도를 불러올 수 없으면 아래 행사 목록을 이용해 주세요.").waitFor();
    await page.getByRole("button",{name:"이 행사 선택"}).first().click();
    assert.ok(await page.locator("#selection").getAttribute("data-id"));
    const capabilities = await page.evaluate(() => ({
      recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      tts: !!window.speechSynthesis,
      koreanVoices: window.speechSynthesis?.getVoices().filter(v => v.lang.startsWith("ko")).length
    }));
    console.log("Edge speech capabilities", capabilities);
    await page.addInitScript(() => {
      window.SpeechRecognition = class {
        start() {
          if (window.simulateDenial) this.onerror({error:"not-allowed"});
          else this.onresult({results:[[{transcript:"전시를 보고 싶어요"}]]});
          this.onend();
        }
      };
      Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
        cancel() {}, speak(utterance) { window.lastSpokenText = utterance.text; }
      }});
    });
    await page.reload();
    await page.getByRole("button",{name:"나들이 찾기"}).click();
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({latitude:37.57, longitude:127.02});
    await page.getByRole("button",{name:"현재 위치 사용"}).click();
    await page.getByText("현재 위치를 반영했어요.").waitFor();
    assert.equal(await page.locator('[name="lng"]').inputValue(),"127.02");
    await page.getByRole("button",{name:"한 번 말하기"}).click();
    assert.equal(await page.locator('[name="note"]').inputValue(), "전시를 보고 싶어요");
    await page.locator('[name="note"]').fill("국악을 듣고 싶어요");
    await page.getByRole("button",{name:"분류 반영"}).click();
    assert.equal(await page.locator('[name="category"]').inputValue(), "국악");
    await page.evaluate(() => { window.simulateDenial = true; });
    await page.getByRole("button",{name:"한 번 말하기"}).click();
    await page.getByText(/마이크 권한 거부/).waitFor();
    assert.equal(await page.locator('[name="note"]').inputValue(),"국악을 듣고 싶어요");
    await page.locator('[name="category"]').selectOption("전체");
    await page.locator('[name="mode"]').selectOption("recorded");
    await submit.click();
    const first = page.locator("#list li").first();
    await first.getByRole("button",{name:"이 행사 선택"}).click();
    await page.getByRole("button",{name:"선택한 행사 읽기"}).click();
    const expected = await first.locator("strong").textContent() + ". " + await first.locator("p").textContent();
    assert.equal(await page.evaluate(() => window.lastSpokenText), expected);
    await page.getByRole("button",{name:"읽기 멈추기"}).click();
    await page.getByText("읽기를 멈췄어요.").waitFor();
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    assert.equal(await page.locator('[name="note"]').inputValue(),"국악을 듣고 싶어요");
    console.log("PASS recorded/live, map sync/fallback, provider failure, simulated transcript/edit/permission/TTS, retained note");
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
