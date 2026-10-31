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
    await page.route("**/map-config",route=>route.fulfill({json:{provider:"leaflet",javascript_key:""}}));
    await page.goto("http://127.0.0.1:8765/checks");
    await page.getByRole("button",{name:"전시 코스 예시 확인"}).click();
    await page.locator("#course-text").filter({hasText:"예상 일정입니다"}).waitFor();
    assert.match(await page.locator("#course-conditions").textContent(), /청량리역.*10:00~19:00.*전시당 30분/);
    assert.equal((await page.locator("#course-text").textContent()).match(/도착 ·/g)?.length, 2);
    const courseLinks = await page.locator("#course-directions a").evaluateAll(links => links.map(link => link.href));
    assert.equal(courseLinks.length, 4);
    const firstLeg = new URL(courseLinks[0]).pathname.split("/");
    const secondLeg = new URL(courseLinks[2]).pathname.split("/");
    assert.equal(firstLeg[5], secondLeg[4]);
    assert.match(decodeURIComponent(firstLeg[4]), /청량리역,37.5805961,127.0482573/);
    await page.reload();
    await page.getByRole("button",{name:"나들이 찾기"}).click();
    assert.equal(await page.locator("#coords").getAttribute("open"), null);
    const submit = page.getByRole("button",{name:"추천받기"});
    await page.locator('[name="note"]').fill("전시 두 곳 코스로");
    await page.getByRole("button",{name:"분류 반영"}).click();
    assert.equal(await page.locator('[name="kind"]').inputValue(), "course");
    await page.locator('[name="start"]').fill("2026-10-31T10:00");
    await page.locator('[name="end"]').fill("2026-10-31T19:00");
    await submit.click();
    const itinerary = page.locator("#course-text");
    await itinerary.filter({hasText:"예상 일정입니다"}).waitFor();
    assert.equal(await page.locator("#list li").count(), 2);
    console.log("live 전시 코스:", await itinerary.textContent());
    const excluded = await page.locator("#list li").first().getAttribute("data-id");
    await page.getByRole("button",{name:"이 장소 제외"}).first().click();
    await page.getByRole("button",{name:"코스 다시 만들기",exact:true}).click();
    await page.waitForFunction(id => !document.querySelector("#results").hidden &&
      [...document.querySelectorAll("#list li")].every(el => el.dataset.id !== id), excluded);
    assert.match(await itinerary.textContent(), /출발지부터 도보/);
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    await page.locator('[name="start"]').fill("2026-10-31T14:00");
    await page.locator('[name="end"]').fill("2026-10-31T17:00");
    await page.locator('[name="category"]').selectOption("국악");
    await submit.click();
    await itinerary.filter({hasText:"이전 조건에서 가능했던 일정"}).waitFor();
    assert.match(await itinerary.textContent(), /도착할 수 없어요|관람 시간이 부족해요/);
    console.log("live 국악 코스:", (await itinerary.textContent()).split("\n")[0]);
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    await page.locator('[name="kind"]').selectOption("place");
    await page.locator('[name="category"]').selectOption("전시");
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
    const detailResponse = page.waitForResponse(response => response.url().endsWith("/preview/walk") &&
      response.request().postDataJSON()?.details === true);
    await page.getByRole("button",{name:"경로안내",exact:true}).first().click();
    const detailBody = await (await detailResponse).json();
    const routeDialog = page.locator("#route-dialog");
    await page.locator("#route-content").waitFor();
    assert.ok(await page.locator("#route-steps li").count() > 1);
    assert.equal(await page.locator("#route-map").isVisible(), false);
    assert.match(await page.locator("#route-summary").textContent(), /분.*km/);
    await page.locator("#route-show-map").click();
    await page.locator("#route-map path.leaflet-interactive").first().waitFor();
    await page.locator("#route-text").click();
    assert.equal(await page.locator("#route-steps").isVisible(), true);
    await page.locator("#route-steps button").nth(1).click();
    assert.equal(await page.locator("#route-map").isVisible(), true);
    await page.locator("#route-text").click();
    await routeDialog.screenshot({path:".local/route-text.png"});
    await page.evaluate(() => { window.savedLeaflet = window.L; window.L = null; });
    await page.locator("#route-show-map").click();
    assert.match(await page.locator("#route-map-status").textContent(), /지도를 불러오지 못했어요/);
    assert.equal(await page.locator("#route-steps").isVisible(), true);
    await page.evaluate(() => { window.L = window.savedLeaflet; });
    console.log("PASS Korean route steps, map polyline, step location, text return");
    await page.locator("#route-close").click();
    await page.route("**/preview/walk", route => route.fulfill({status:502,json:{message:"경로 조회 실패 검증"}}));
    await page.getByRole("button",{name:"경로안내",exact:true}).first().click();
    await page.locator("#route-status").filter({hasText:"경로 조회 실패 검증"}).waitFor();
    assert.equal(await page.locator("#route-content").isVisible(), false);
    await page.unroute("**/preview/walk");
    await page.route("**/preview/walk", route => route.fulfill({json:detailBody}));
    await page.locator("#route-retry").click();
    await page.locator("#route-content").waitFor();
    await page.locator("#route-close").click();
    await page.unroute("**/preview/walk");
    let pendingRoute;
    let markIntercepted;
    const intercepted = new Promise(resolve => { markIntercepted = resolve; });
    await page.route("**/preview/walk", route => { pendingRoute = route; markIntercepted(); });
    await page.getByRole("button",{name:"경로안내",exact:true}).first().click();
    await intercepted;
    await page.locator("#route-close").click();
    await pendingRoute.fulfill({json:detailBody});
    assert.equal(await routeDialog.isVisible(), false);
    assert.equal(await page.locator("#route-steps li").count(), 0);
    await page.unroute("**/preview/walk");
    const selectedId = await page.locator("#selection").getAttribute("data-id");
    const directionPanel = page.locator("#event-directions");
    assert.equal(await directionPanel.locator("a").count(), 2);
    const selectedHref = await directionPanel.locator("a").first().getAttribute("href");
    await directionPanel.locator("summary").click();
    for (const mode of ["walk", "traffic"]) {
      const link = directionPanel.locator('a[href*="/by/' + mode + '/"]');
      const href = await link.getAttribute("href");
      assert.match(decodeURIComponent(href), /청량리역,37.5805961,127.0482573/);
      const popupPromise = page.waitForEvent("popup");
      await link.click();
      const popup = await popupPromise;
      try {
        await popup.waitForLoadState("domcontentloaded", {timeout:15000});
        const destination = decodeURIComponent(new URL(href).pathname.split("/")[5]).split(",")[0];
        await popup.waitForFunction(expected => [...document.querySelectorAll("input")].some(input =>
          input.value === expected), destination, {timeout:15000});
        const opened = new URL(popup.url());
        assert.equal(opened.hostname, "map.kakao.com");
        assert.equal(opened.searchParams.get("target"), mode);
        assert.equal(opened.searchParams.get("rt1"), "청량리역");
        assert.equal(opened.searchParams.get("rt2"), destination);
        console.log("Kakao " + mode + ": correct origin/destination/mode; destination input visible");
      } finally { await popup.close(); }
      assert.equal(await page.locator("#selection").getAttribute("data-id"), selectedId);
      assert.equal(await page.locator('[name="label"]').inputValue(), "청량리역");
    }
    const pins = page.locator("#map .event-pin");
    await pins.first().waitFor();
    assert.equal(await pins.count(), 5);
    assert.equal(await pins.first().evaluate(el => el.classList.contains("active")), true);
    await pins.nth(1).click();
    assert.notEqual(await directionPanel.locator("a").first().getAttribute("href"),
      selectedHref);
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
    await page.locator("#status").filter({hasText:"조회 실패 검증"}).waitFor();
    assert.match(await page.locator("#status").textContent(), /이전 조건과 결과는 보관/);
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
          if (window.speechError) {
            if (window.speechError !== "network") this.onaudiostart();
            this.onerror({error:window.speechError, message:"test engine detail"});
          }
          else this.onresult({results:[[{transcript:window.emptyResult ? "" : "국악을 듣고 싶어"}]]});
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
    assert.equal(await page.locator('[name="note"]').inputValue(), "국악을 듣고 싶어");
    assert.equal(await page.locator('[name="category"]').inputValue(), "국악");
    const sent = page.waitForRequest(r => r.url().endsWith("/preview/recommend") && r.method() === "POST");
    await submit.click();
    assert.equal((await sent).postDataJSON().category, "국악");
    await page.getByRole("heading",{name:"국악 행사 추천"}).waitFor();
    await page.locator("#list li").first().waitFor();
    console.log("live 국악:", await page.locator("#list li strong").allTextContents());
    const walkFrom = page.locator("#walk-from");
    const walkTo = page.locator("#walk-to");
    const walkNote = page.locator("#walk-note");
    const walkCheck = page.getByRole("button",{name:"도보 시간 확인"});
    const firstId = await walkFrom.inputValue();
    const secondId = await walkTo.inputValue();
    const originalWalk = await page.locator("#walk-directions a").first().getAttribute("href");
    await walkCheck.click();
    await walkNote.filter({hasText:"시간이 부족해요"}).waitFor();
    console.log("live 도보:", await walkNote.textContent());
    await walkFrom.selectOption(secondId);
    assert.equal(await walkCheck.isDisabled(), true);
    assert.equal(await page.locator("#walk-directions a").count(), 0);
    await walkTo.selectOption(firstId);
    const reversedWalk = await page.locator("#walk-directions a").first().getAttribute("href");
    assert.equal(new URL(originalWalk).pathname.split("/")[4], new URL(reversedWalk).pathname.split("/")[5]);
    await page.route("**/preview/walk", route => route.fulfill({json:{duration_s:300,distance_m:320}}));
    await walkCheck.click();
    await walkNote.filter({hasText:"체류시간"}).waitFor();
    await page.unroute("**/preview/walk");
    await page.route("**/preview/walk", route => route.fulfill({status:502,json:{message:"도보 경로를 확인하지 못했어요."}}));
    await walkCheck.click();
    await walkNote.filter({hasText:"확인하지 못했어요"}).waitFor();
    assert.equal(await walkFrom.inputValue(), secondId);
    await page.unroute("**/preview/walk");
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    await page.locator('[name="note"]').fill("국악 말고 전시");
    assert.equal(await page.locator('[name="category"]').evaluate(el => el.validity.valueMissing), true);
    await page.locator('[name="note"]').fill("국악을 듣고 싶어요");
    await page.getByRole("button",{name:"분류 반영"}).click();
    assert.equal(await page.locator('[name="category"]').inputValue(), "국악");
    for (const code of ["network","not-allowed","audio-capture","service-not-allowed","no-speech"]) {
      await page.evaluate(value => { window.speechError = value; }, code);
      await page.getByRole("button",{name:"한 번 말하기"}).click();
      assert.ok((await page.locator("#voice-status").textContent()).includes("(" + code + ")"));
      assert.equal(await page.locator("#voice-debug").getAttribute("open"), "");
      const log = await page.locator("#voice-log").inputValue();
      assert.match(log, /\+\d+ ms  start\(\) 호출/);
      assert.match(log, /ms  end/);
      assert.ok(log.includes("error " + code + " · 엔진 메시지: test engine detail"));
      assert.equal(log.includes("audiostart"), code !== "network");
      assert.ok(!log.includes("국악을 듣고 싶어요") && !log.includes("전시를 보고 싶어요"));
      assert.equal(await page.locator('[name="note"]').evaluate(el => el === document.activeElement),true);
      assert.equal(await page.locator('[name="note"]').inputValue(),"국악을 듣고 싶어요");
    }
    await page.context().setOffline(true);
    try {
      await page.evaluate(() => { window.speechError = "network"; });
      await page.getByRole("button",{name:"한 번 말하기"}).click();
      assert.match(await page.locator("#voice-status").textContent(), /오프라인/);
      assert.doesNotMatch(await page.locator("#voice-status").textContent(), /Windows 키/);
      assert.match(await page.locator("#voice-log").inputValue(), /오류 시점 브라우저 온라인 표시 false/);
      assert.equal(await page.locator('[name="note"]').inputValue(),"국악을 듣고 싶어요");
    } finally { await page.context().setOffline(false); }
    await page.evaluate(() => { window.speechError = ""; window.emptyResult = true; });
    await page.getByRole("button",{name:"한 번 말하기"}).click();
    assert.match(await page.locator("#voice-status").textContent(), /empty-result/);
    assert.match(await page.locator("#voice-log").inputValue(), /전사 0자/);
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
    if (process.platform === "win32") {
      await page.getByRole("button",{name:"음성 파일로 듣기"}).click();
      const player = page.locator("#player");
      await player.waitFor();
      await page.waitForFunction(() => document.querySelector("#player").currentTime > 0.15);
      const seconds = await player.evaluate(async el => {
        const bytes = await (await fetch(el.src)).arrayBuffer();
        const context = new OfflineAudioContext(1, 1, 24000);
        const wave = await context.decodeAudioData(bytes);
        return wave.getChannelData(0).some(sample => Math.abs(sample) > 0.01) ? wave.duration : 0;
      });
      assert.ok(seconds > 1);
      console.log("Korean card WAV, decoded non-silent seconds:", seconds.toFixed(1));
    }
    await page.getByRole("button",{name:"조건 바꾸기"}).click();
    assert.equal(await page.locator('[name="note"]').inputValue(),"국악을 듣고 싶어요");
    console.log("PASS recorded/live, map sync/fallback, provider failure, simulated transcript/edit/permission/TTS, retained note");
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
