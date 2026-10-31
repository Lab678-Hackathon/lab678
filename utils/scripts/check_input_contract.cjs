/** 최소 60분 프론트/서버 검증·인라인 오류·입력 보존을 실제 로컬 서버에서 확인한다.
 * 실행: node utils/scripts/check_input_contract.cjs. 기존 PLAYWRIGHT_MODULE/CHROMIUM_PATH 설정을 사용한다.
 */
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 59분은 전송하지 않고 60분은 기록 추천을 받으며 서버 오류도 필드 아래에 표시한다. */
async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8765/checks");
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.locator('[name="start"]').fill("2026-10-31T14:00");
    await page.locator('[name="end"]').fill("2026-10-31T14:59");
    await page.locator('[name="note"]').fill("조용한 전시를 보고 싶어요");
    let requests = 0;
    page.on("request", request => { if (request.url().endsWith("/preview/recommend")) requests++; });
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#end-error").waitFor();
    assert.match(await page.locator("#end-error").textContent(),/최소 1시간/);
    assert.equal(requests,0);
    assert.equal(await page.locator('[name="end"]').getAttribute("aria-invalid"),"true");
    assert.equal(await page.locator('[name="note"]').inputValue(),"조용한 전시를 보고 싶어요");
    await page.screenshot({path:".local/minimum-time-error.png",fullPage:true});
    const data = await (await page.request.get("http://127.0.0.1:8765/example")).json();
    Object.assign(data,{start_at:"2026-10-31T14:00:00+09:00",end_at:"2026-10-31T14:59:00+09:00",mode:"recorded"});
    const invalid = await page.request.post("http://127.0.0.1:8765/preview/recommend",{data});
    assert.equal(invalid.status(),400);
    assert.deepEqual(await invalid.json(),{status:"need_input",code:"minimum_duration",field:"end_at",message:"나들이 시간은 최소 1시간 이상으로 설정해 주세요."});
    await page.locator('[name="end"]').fill("2026-10-31T15:00");
    assert.equal(await page.locator("#end-error").isVisible(),false);
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#results").waitFor();
    assert.equal(requests,1);
    assert.ok(await page.locator("#list li").count() > 0);
    await page.getByRole("button",{name:"조건 바꾸기",exact:true}).click();
    assert.equal(await page.locator('[name="note"]').inputValue(),"조용한 전시를 보고 싶어요");
    await page.route("**/preview/recommend",route => route.fulfill({status:400,json:{status:"need_input",code:"invalid_time_range",field:"end_at",message:"서버 시간 오류 테스트"}}));
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#end-error").filter({hasText:"서버 시간 오류 테스트"}).waitFor();
    assert.equal(await page.locator('[name="note"]').inputValue(),"조용한 전시를 보고 싶어요");
    assert.deepEqual(errors,[]);
    console.log("PASS 59-minute client block and HTTP400, 60-minute recorded recommendation, inline server error, retained input");
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode=1;});
