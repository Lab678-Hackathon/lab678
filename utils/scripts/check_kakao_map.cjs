/** 카카오 지도 분기의 카드·경로 표시와 SDK 실패 대체를 검사한다.
 * 기본은 모의 SDK 계약 검사이며 --live는 실제 등록 키/도메인의 지도 표시를 확인한다.
 */
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 네트워크 지도 대신 DOM 도형으로 카카오 호출 규격을 모의한다. 실제 지도 검증과 구분한다. */
function mockKakao() {
  class LatLng {constructor(lat,lng){this.lat=lat;this.lng=lng;}}
  class Bounds {constructor(){this.points=[];}extend(point){this.points.push(point);}}
  class FakeMap {
    constructor(box,options){this.box=box;this.level=options.level;}
    addControl(){} relayout(){} panTo(point){this.box.dataset.center=JSON.stringify(point);}
    setBounds(bounds){this.box.dataset.bounds=JSON.stringify(bounds.points);}
    getLevel(){return this.level;} setLevel(level){this.level=level;}
  }
  class Overlay {
    constructor(options){this.options=options;this.element=options.content || document.createElement("span");}
    setMap(map){this.element.remove();if (map) map.box.append(this.element);}
  }
  class Line extends Overlay {
    constructor(options){super(options);this.element.dataset.line=JSON.stringify(options.path);this.element.dataset.color=options.strokeColor;}
  }
  window.kakao={maps:{load:callback=>callback(),LatLng,LatLngBounds:Bounds,Map:FakeMap,
    ZoomControl:class {},ControlPosition:{RIGHT:1},CustomOverlay:Overlay,Polyline:Line,Circle:Overlay}};
}

/** 같은 화면의 추천 핀 선택·경로 텍스트/지도 전환·미제공 좌표 생략을 확인한다. */
async function main() {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const live=process.argv.includes("--live"), errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    if (!live) {
      await page.addInitScript(mockKakao);
      await page.route("**/map-config",route=>route.fulfill({json:{provider:"kakao",javascript_key:"a".repeat(32)}}));
      await page.route("https://dapi.kakao.com/v2/maps/sdk.js?*",route=>route.fulfill({contentType:"text/javascript",body:"/* mock SDK supplied by test */"}));
    }
    await page.goto("http://127.0.0.1:8765");
    await page.waitForFunction(()=>document.documentElement.dataset.mapProvider==="kakao");
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#map .kakao-pin").first().waitFor();
    await page.locator("#map .kakao-pin").nth(1).click();
    assert.equal(await page.locator('#list li[aria-current="true"]').count(),1);
    assert.equal(await page.locator("#map .kakao-pin.active").textContent(),"2");
    await page.route("**/preview/walk",route=>route.fulfill({json:{status:"ready",distance_m:150,duration_s:120,
      path:[[37.57,126.98],[37.571,126.981]],steps:[{instruction:"모의 직진 안내",distance_m:150,duration_s:120,begin:0,end:1}]}}));
    await page.getByRole("button",{name:"도보 안내 보기",exact:true}).first().click();
    await page.locator("#route-content").waitFor();
    await page.locator("#route-show-map").click();
    assert.equal(await page.locator("#route-map").getAttribute("data-provider"),"kakao");
    await page.locator("#route-text").click();
    await page.locator("#route-steps button").first().click();
    assert.equal(await page.locator("#route-map").isVisible(),true);
    if (!live) assert.equal(await page.locator("#route-map [data-line]").count(),1);
    await page.locator("#route-close").click();
    if (live) {
      await page.waitForFunction(()=>[...document.querySelectorAll("#map img")].some(img=>img.complete&&img.naturalWidth>100));
      await page.locator("#map").screenshot({path:".local/kakao-live-map.png"});
    }
    assert.deepEqual(errors,[]);
    console.log(live ? "PASS actual Kakao SDK/tiles and marker selection; route uses mock coordinates" : "PASS mock Kakao SDK contract, pin/card sync, route/step/map switch");
    if (!live) {
      await page.route("https://dapi.kakao.com/v2/maps/sdk.js?*",route=>route.abort());
      await page.reload();
      await page.waitForFunction(()=>document.documentElement.dataset.mapProvider==="leaflet");
      await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
      await page.locator('[name="mode"]').selectOption("recorded");
      await page.getByRole("button",{name:"추천받기",exact:true}).click();
      await page.locator("#map .event-pin").first().waitFor();
      assert.match(await page.locator("#map-note").textContent(),/카카오.*기본 지도/);
      console.log("PASS Kakao SDK failure retains cards with explicit fallback map notice");
    }
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
