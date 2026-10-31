/** 로컬 대중교통 미설정 실응답과 모의 정상·실패·전환·취소 화면을 구분해 검증한다.
 * check_outing_ui.cjs와 같은 PLAYWRIGHT_MODULE / CHROMIUM_PATH 환경으로 실행한다.
 */
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 실제 행사 선택 후 연결 상태를 확인하고 가상 노선으로만 상세 표시·전환 회귀를 검사한다. */
async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.goto("http://127.0.0.1:8765");
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    const selected = await page.locator("#selection").getAttribute("data-id");
    const response = page.waitForResponse(r => r.url().endsWith("/preview/transit"));
    await page.getByRole("button",{name:"대중교통 안내 보기",exact:true}).first().click();
    const actual = await (await response).json();
    await page.locator("#route-status").filter({hasText:actual.message || "요금"}).waitFor();
    assert.equal(actual.status,"unconfigured","이 검사는 키 미설정 환경에서 수행합니다. 키 연결 시 실제 응답 검증으로 전환하세요.");
    assert.equal(await page.locator("#route-content").isVisible(),false);
    assert.match(await page.locator("#transit-map-link").getAttribute("href"),/^https:\/\/map.kakao.com\/link\/by\/traffic\//);
    await page.locator("#route-dialog").screenshot({path:".local/transit-unconfigured.png"});
    await page.locator("#route-close").click();
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    console.log("PASS actual missing-key response, external map fallback, selection preserved (not live routing)");

    const steps=[{mode:"WALKING",instruction:"테스트 출발역으로 이동",duration_s:300,distance_m:300},
      {mode:"SUBWAY",instruction:"테스트 1호선 · 출발역 승차 → 도착역 하차",duration_s:1200,distance_m:6400},
      {mode:"WALKING",instruction:"테스트 목적지로 이동",duration_s:300,distance_m:300}];
    const route={duration_s:1800,distance_m:7000,transfers:0,walk_duration_s:600,walk_distance_m:600,fare_won:1550,steps};
    const fixture={status:"ready",provider:"카카오맵",checked_at:"2026-10-31T02:00:00Z",time_basis:"테스트 응답. 나들이 날짜·출발시각은 적용되지 않아요.",
      routes:[route,{...route,duration_s:2100,transfers:1,fare_won:null}]};
    let state="ready", release, markStarted;
    const started = new Promise(resolve => {markStarted=resolve;});
    await page.route("**/preview/transit",async request => {
      if (state === "failed") return request.fulfill({status:429,json:{status:"limited",message:"조회 한도 테스트"}});
      if (state === "empty") return request.fulfill({json:{status:"no_results",routes:[],message:"경로 없음 테스트"}});
      if (state === "delayed") await new Promise(resolve=>{release=resolve;markStarted();});
      await request.fulfill({json:fixture}).catch(()=>{});
    });
    await page.getByRole("button",{name:"대중교통 안내 보기",exact:true}).first().click();
    await page.locator("#route-content").waitFor();
    assert.equal(await page.locator("#route-steps li").count(),3);
    assert.match(await page.locator("#route-summary").textContent(),/30분.*환승 0회.*도보 10분.*600m/);
    assert.match(await page.locator("#route-status").textContent(),/1,550원/);
    assert.match(await page.locator("#transit-note").textContent(),/출발시각은 적용되지/);
    assert.equal(await page.locator("#route-show-map").isVisible(),false);
    await page.locator("#transit-choices button").nth(1).click();
    assert.match(await page.locator("#route-summary").textContent(),/35분.*환승 1회/);
    assert.match(await page.locator("#route-status").textContent(),/요금 미확인/);
    await page.locator("#route-dialog").screenshot({path:".local/transit-fixture.png"});
    await page.locator("#route-mode-walk").click();
    await page.locator("#route-content").waitFor();
    assert.equal(await page.locator("#route-title").textContent(),"도보 경로안내");
    assert.equal(await page.locator("#route-show-map").isVisible(),true);
    assert.equal(await page.locator("#transit-choices").isVisible(),false);
    state="failed";
    await page.locator("#route-mode-transit").click();
    await page.locator("#route-status").filter({hasText:"조회 한도 테스트"}).waitFor();
    assert.equal(await page.locator("#route-content").isVisible(),false);
    state="ready";
    await page.locator("#route-retry").click();
    await page.locator("#route-content").waitFor();
    state="empty";
    await page.locator("#route-mode-transit").click();
    await page.locator("#route-status").filter({hasText:"경로 없음 테스트"}).waitFor();
    assert.equal(await page.locator("#route-content").isVisible(),false);
    state="delayed";
    await page.locator("#route-mode-transit").click();
    await started;
    await page.locator("#route-close").click();
    release();
    assert.equal(await page.locator("#route-dialog").isVisible(),false);
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    console.log("PASS simulated transit summaries/steps/fare/route selection, actual walking switch, errors/retry/no-results/close");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
