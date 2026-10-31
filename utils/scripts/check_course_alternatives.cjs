/** 로컬 서버에서 동의·대안 선택·취소·실패·늦은 응답을 한 구간으로 검증한다.
 * 실행 환경은 check_outing_ui.cjs와 동일한 PLAYWRIGHT_MODULE / CHROMIUM_PATH를 사용한다.
 */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 실제 전시 14~17시 충돌에서 시작하고 실패/지연만 주입해 사용자 조건 보존을 검증한다. */
async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    let alternativeRequests = 0;
    page.on("request", request => {
      if (request.url().endsWith("/preview/recommend") && request.postDataJSON()?.alternatives) alternativeRequests++;
    });
    await page.goto("http://127.0.0.1:8765");
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="kind"]').selectOption("course");
    await page.locator('[name="category"]').selectOption("전시");
    const originalResponse = page.waitForResponse(r => r.url().endsWith("/preview/recommend"));
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    const original = await (await originalResponse).json();
    await page.locator("#alternatives").waitFor();
    assert.equal(alternativeRequests,0);
    const before = await page.locator("#course-text").textContent();
    const response = page.waitForResponse(r => r.url().endsWith("/preview/recommend") && r.request().postDataJSON()?.alternatives);
    await page.locator("#find-alternatives").click();
    const alternatives = await (await response).json();
    await page.locator("#alternative-list button").nth(1).waitFor();
    assert.equal(alternativeRequests,1);
    assert.equal(await page.locator('[name="start"]').inputValue(),"2026-10-31T14:00");
    assert.equal(await page.locator("#course-text").textContent(),before);
    assert.equal(alternatives.course.alternatives.length,2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.locator("#alternatives").screenshot({path:".local/course-alternatives.png"});
    await page.locator("#alternative-list button").first().click();
    assert.equal(await page.locator("#list > li").count(),1);
    assert.equal(await page.locator('[name="kind"]').inputValue(),"place");
    assert.equal(await page.locator("#course-directions a").count(),2);
    assert.match(await page.locator("#course-text").textContent(),/한 곳을 관람할 수/);

    // 응답을 고정해 조건 변경·다른 대안·오류 경로를 외부 호출 없이 재현한다.
    let behavior = "normal";
    let release;
    let markStarted;
    const started = new Promise(resolve => { markStarted = resolve; });
    await page.route("**/preview/recommend", async route => {
      if (!route.request().postDataJSON()?.alternatives) return route.fulfill({json:original});
      if (behavior === "failure") return route.fulfill({status:502,json:{message:"대안 조회 실패 검증"}});
      if (behavior === "empty") return route.fulfill({json:{...alternatives, course:{...alternatives.course,alternatives:[]}}});
      if (behavior === "unavailable") return route.fulfill({json:{...alternatives, course:{status:"unavailable",message:"도보 조회 실패 검증"}}});
      if (behavior === "delay") await new Promise(resolve => { release = resolve; markStarted(); });
      await route.fulfill({json:alternatives}).catch(() => {});
    });
    await page.locator("#back").click();
    await page.locator('[name="kind"]').selectOption("course");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#find-alternatives").click();
    await page.locator("#alternative-list button").nth(1).click();
    assert.equal(await page.locator('[name="start"]').inputValue(),alternatives.course.alternatives[1].start_at.slice(0,16));
    assert.equal(await page.locator("#list > li").count(),2);
    assert.equal(await page.locator("#course-directions a").count(),4);
    assert.match(await page.locator("#course-text").textContent(),/두 곳을 관람할 수/);

    await page.locator("#back").click();
    await page.locator('[name="start"]').fill("2026-10-31T14:00");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    behavior = "failure";
    await page.locator("#find-alternatives").click();
    await page.locator("#alternatives-status").filter({hasText:"기존 조건은 유지"}).waitFor();
    assert.equal(await page.locator('[name="start"]').inputValue(),"2026-10-31T14:00");
    behavior = "empty";
    await page.locator("#find-alternatives").click();
    await page.locator("#alternatives-status").filter({hasText:"대안을 찾지 못했어요"}).waitFor();
    assert.equal(await page.locator("#alternative-list button").count(),0);
    behavior = "unavailable";
    await page.locator("#find-alternatives").click();
    await page.locator("#alternatives-status").filter({hasText:"도보 조회 실패 검증"}).waitFor();
    behavior = "normal";
    await page.locator("#find-alternatives").click();
    await page.locator("#alternative-list button").nth(1).waitFor();
    await page.locator("#keep-course").click();
    assert.equal(await page.locator("#alternatives").isVisible(),false);
    assert.equal(await page.locator('[name="start"]').inputValue(),"2026-10-31T14:00");

    await page.locator("#back").click();
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    behavior = "delay";
    await page.locator("#find-alternatives").click();
    await started;
    assert.ok(release);
    await page.locator("#back").click();
    release();
    assert.equal(await page.locator("#results").isVisible(),false);
    assert.equal(await page.locator("#alternative-list button").count(),0);
    console.log("PASS actual consent -> 2 alternatives -> single/earlier pair apply; unchanged until choice; failure/retry/cancel/stale response");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
