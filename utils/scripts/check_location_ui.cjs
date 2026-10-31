/** 모의 위치로 사용자 시작/중지·오차·오래된 좌표·권한 실패·화면 이탈을 검사한다.
 * --kakao-live는 실제 SDK/지도에서 모의 위치를 검사한다. 실제 GPS/모바일 이동 검증은 아니다.
 */
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
const {mockKakao}=require("./check_kakao_map.cjs");

/** 브라우저 위치 공급자만 모의하고 실제 화면·지도 레이어를 통해 수집 생명주기를 검증한다. */
async function main() {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    const kakao=process.argv.includes("--kakao-mock");
    const live=process.argv.includes("--kakao-live");
    const shapes=live ? '#map .route-dot[title="내 위치"]' : kakao ? '#map [data-circle], #map .route-dot[title="내 위치"]' : '#map path[stroke="#2674dc"]';
    if (kakao) {
      await page.addInitScript(mockKakao);
      await page.route("**/map-config",route=>route.fulfill({json:{provider:"kakao",javascript_key:"a".repeat(32)}}));
      await page.route("https://dapi.kakao.com/v2/maps/sdk.js?*",route=>route.fulfill({contentType:"text/javascript",body:"/* mock SDK */"}));
    } else if (!live) await page.route("**/map-config",route=>route.fulfill({json:{provider:"leaflet",javascript_key:""}}));
    await page.addInitScript(()=>{
      window.geo={count:0,cleared:[],ok:null,fail:null};
      Object.defineProperty(navigator,"geolocation",{value:{
        watchPosition(ok,fail){geo.ok=ok;geo.fail=fail;return ++geo.count;},
        clearWatch(id){geo.cleared.push(id);}
      }});
      window.givePosition=(lat=37.58,accuracy=20,age=0)=>geo.ok({coords:{latitude:lat,longitude:127.02,accuracy},timestamp:Date.now()-age});
    });
    await page.goto("http://127.0.0.1:8765/checks");
    if (live) await page.waitForFunction(()=>document.documentElement.dataset.mapProvider==="kakao");
    assert.equal(await page.evaluate(()=>geo.count),0);
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#map .event-pin").first().waitFor();
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    const selected=await page.locator("#selection").getAttribute("data-id");
    const before=await page.locator('[name="lat"]').inputValue();
    let sent=0;page.on("request",request=>{if (request.method()==="POST") sent++;});
    const toggle=page.locator("#result-location [data-location-toggle]"), note=page.locator("#result-location .location-note");
    await toggle.click();
    assert.equal(await page.evaluate(()=>geo.count),1);
    await page.evaluate(()=>givePosition());
    assert.match(await note.textContent(),/20m/);
    assert.equal(await page.locator(shapes).count(),live ? 1 : 2);
    await page.evaluate(()=>givePosition(37.581,250));
    assert.match(await note.textContent(),/오차가 큰/);
    assert.equal(await page.locator('[name="lat"]').inputValue(),before);
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    await page.locator("#result-location [data-location-center]").click();
    await toggle.click();
    assert.deepEqual(await page.evaluate(()=>geo.cleared),[1]);
    await page.evaluate(()=>givePosition());
    assert.equal(await page.locator(shapes).count(),0);
    assert.equal(await page.locator("#result-location [data-location-center]").isEnabled(),false);
    await toggle.click();await page.evaluate(()=>geo.fail({code:1}));
    assert.match(await note.textContent(),/권한이 거부/);
    await toggle.click();await page.evaluate(()=>givePosition(37.58,20,60000));
    assert.match(await note.textContent(),/최신 위치/);
    await toggle.click();await page.evaluate(()=>givePosition());
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"));});
    assert.equal(await page.locator(shapes).count(),0);
    assert.match(await note.textContent(),/화면을 벗어나/);
    await page.evaluate(()=>Object.defineProperty(document,"hidden",{value:false,configurable:true}));
    await page.clock.install();
    await toggle.click();await page.evaluate(()=>givePosition());
    await page.clock.fastForward(31000);
    assert.match(await note.textContent(),/갱신이 멈춰/);
    assert.equal(sent,0);
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    await toggle.click();await page.evaluate(()=>givePosition());
    await page.getByRole("button",{name:"조건 바꾸기",exact:true}).click();
    assert.equal(await page.locator(shapes).count(),0);
    await page.getByRole("button",{name:"이전 조건과 결과로 돌아가기",exact:true}).click();
    await page.route("**/preview/walk",route=>route.fulfill({json:{status:"ready",distance_m:150,duration_s:120,
      path:[[37.57,126.98],[37.571,126.981]],steps:[{instruction:"모의 안내",distance_m:150,duration_s:120,begin:0,end:1}]}}));
    await page.getByRole("button",{name:"도보 안내 보기",exact:true}).first().click();
    await page.locator("#route-content").waitFor();
    await page.locator("#route-show-map").click();
    await page.locator("#route-location [data-location-toggle]").click();
    await page.evaluate(()=>givePosition());
    assert.match(await page.locator("#route-location .location-note").textContent(),/갱신 중/);
    assert.equal(await page.locator(shapes.replaceAll('#map ','#route-map ')).count(),live ? 1 : 2);
    await page.locator("#route-text").click();
    assert.equal(await page.locator("#route-location").isVisible(),false);
    assert.equal(await page.locator(shapes).count(),0);
    await page.locator("#route-show-map").click();
    await page.locator("#route-location [data-location-toggle]").click();
    await page.evaluate(()=>givePosition());
    await page.locator("#route-close").click();
    await page.evaluate(()=>givePosition());
    assert.equal(await page.locator(shapes).count(),0);
    assert.deepEqual(errors,[]);
    console.log("PASS mock position ("+(live ? "actual Kakao SDK" : kakao ? "mock Kakao" : "Leaflet")+"): no autostart, accuracy/update, stop/stale callback, permission/stale fix, hide/expiry/back/route-close cleanup, no location POST or origin/selection changes");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
