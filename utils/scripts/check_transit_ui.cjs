/** 로컬 대중교통 미설정 실응답과 모의 정상·실패·전환·취소 화면을 구분해 검증한다.
 * check_outing_ui.cjs와 같은 PLAYWRIGHT_MODULE / CHROMIUM_PATH 환경으로 실행한다. --live는 실제 키 연결 검증이다.
 */
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 실제 행사 선택 후 연결 상태를 확인하고 가상 노선으로만 상세 표시·전환 회귀를 검사한다. */
async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const pageErrors = [];
    await page.route("**/map-config",route=>route.fulfill({json:{provider:"leaflet",javascript_key:""}}));
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto("http://127.0.0.1:8765/checks");
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    const selected = await page.locator("#selection").getAttribute("data-id");
    const response = page.waitForResponse(r => r.url().endsWith("/preview/transit"));
    await page.getByRole("button",{name:"대중교통 안내 보기",exact:true}).first().click();
    const actual = await (await response).json();
    await page.locator("#route-status").filter({hasText:actual.message || "요금"}).waitFor();
    const live = process.argv.includes("--live");
    if (live) {
      assert.equal(actual.status,"ready");
      await page.locator("#route-content").waitFor();
      assert.ok(actual.routes.length > 0);
      for (const [index,route] of actual.routes.entries()) {
        await page.locator("#transit-choices button").nth(index).click();
        assert.equal(await page.locator("#route-steps li").count(),route.steps.length);
        assert.equal(route.walk_duration_s,null);
        assert.match(await page.locator("#route-summary").textContent(),/총 도보 확인 필요/);
        assert.doesNotMatch(await page.locator("#route-summary").textContent(),/도보 0분/);
      }
      await page.locator("#transit-choices button").first().click();
      assert.ok(actual.routes.some(route => route.steps.some(step => step.path?.length >= 2)));
      await page.locator("#route-show-map").click();
      await page.locator("#route-map .leaflet-tile-loaded").first().waitFor();
      assert.ok(await page.locator("#route-map path.leaflet-interactive").count() > 0);
      await page.locator("#route-dialog").screenshot({path:".local/transit-live-map.png"});
      await page.locator("#route-text").click();
      console.log("PASS live transit routes:",actual.routes.map(r => ({minutes:Math.ceil(r.duration_s/60),transfers:r.transfers,steps:r.steps.length})));
    } else {
      assert.equal(actual.status,"unconfigured");
      assert.equal(await page.locator("#route-content").isVisible(),false);
    }
    assert.match(await page.locator("#transit-map-link").getAttribute("href"),/^https:\/\/map.kakao.com\/link\/by\/traffic\//);
    await page.locator("#route-dialog").screenshot({path:live ? ".local/transit-live.png" : ".local/transit-unconfigured.png"});
    await page.locator("#route-close").click();
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    console.log("PASS external map link and selection preserved; live routing:",live);

    const steps=[{mode:"WALKING",instruction:"테스트 출발역으로 이동",duration_s:300,distance_m:300,path:[]},
      {mode:"SUBWAY",instruction:"테스트 1호선 · 출발역 승차 → 도착역 하차",duration_s:1200,distance_m:6400,
        path:[[37.58,127.048],[37.579,127.02],[37.577,126.991]]},
      {mode:"WALKING",instruction:"테스트 목적지로 이동",duration_s:300,distance_m:300,path:[]}];
    const route={duration_s:1800,distance_m:7000,transfers:0,walk_duration_s:null,walk_distance_m:null,
      listed_walk_duration_s:600,listed_walk_distance_m:600,walk_note:"전체 도보량은 확인되지 않았어요.",fare_won:1550,steps};
    const fixture={status:"ready",provider:"카카오맵",checked_at:"2026-10-31T02:00:00Z",time_basis:"테스트 응답. 나들이 날짜·출발시각은 적용되지 않아요.",
      routes:[route,{...route,duration_s:2100,transfers:1,fare_won:null,
        steps:steps.map(step=>({...step,path:[]}))}]};
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
    assert.match(await page.locator("#route-summary").textContent(),/30분.*환승 0회.*총 도보 확인 필요/);
    assert.match(await page.locator("#route-status").textContent(),/안내에 포함된 도보 약 10분.*600m/);
    assert.match(await page.locator("#route-status").textContent(),/1,550원/);
    assert.match(await page.locator("#transit-note").textContent(),/출발시각은 적용되지/);
    assert.equal(await page.locator("#route-show-map").isVisible(),true);
    await page.locator("#route-steps button").first().click();
    assert.equal(await page.locator("#route-map").isVisible(),true);
    assert.equal(await page.locator("#route-steps").isVisible(),false);
    assert.match(await page.locator("#route-map-status").textContent(),/좌표가 없는 구간/);
    assert.equal(await page.locator('#route-map path[stroke="#aa5100"][fill="none"]').count(),1);
    // 누락된 접근 도보를 직선으로 채우지 않고 제공된 지하철 선 하나만 그린다.
    assert.equal(await page.locator('#route-map path.leaflet-interactive[fill="none"]').count(),2);
    await page.locator("#transit-choices button").nth(1).click();
    assert.match(await page.locator("#route-summary").textContent(),/35분.*환승 1회/);
    assert.match(await page.locator("#route-status").textContent(),/요금 미확인/);
    assert.equal(await page.locator("#route-map").isVisible(),true);
    assert.match(await page.locator("#route-map-status").textContent(),/노선 좌표가 없어/);
    assert.equal(await page.locator("#route-map path.leaflet-interactive").count(),0);
    await page.locator("#route-text").click();
    assert.equal(await page.locator("#route-steps li").count(),3);
    await page.locator("#transit-choices button").first().click();
    await page.locator("#route-show-map").click();
    assert.ok(await page.locator("#route-map path.leaflet-interactive").count() > 0);
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
    assert.deepEqual(pageErrors,[]);
    console.log("PASS simulated transit summaries/steps/fare/route selection, actual walking switch, errors/retry/no-results/close");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
