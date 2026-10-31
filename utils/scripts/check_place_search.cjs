/** 실제 카카오 검색→좌표 선택→서울시 추천과 5173 CORS를 브라우저에서 검증한다.
 * 팀 UI 대신 빈 5173 포트에 임시 테스트 문서를 제공한다. 실행 중 백엔드와 저장된 REST 키가 필요하다.
 * 실행: node utils/scripts/check_place_search.cjs [--write-examples]
 * 옵션을 주면 고정 공개 장소의 정규화 응답만 docs/development/examples에 저장한다.
 * 사용자 검색어·키·공급자 원문을 읽거나 기록하지 않는다. 팀 화면 통합 검증은 별도다.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.LAB678_TEST_BASE || "http://127.0.0.1:8765";
const front = "http://127.0.0.1:5173";

/** 브라우저 fetch로 사전요청까지 실행하고 공개 JSON과 HTTP 상태를 반환한다. */
async function post(page, endpoint, data) {
  return page.evaluate(async ({base,endpoint,data}) => {
    const response = await fetch(base+endpoint, {method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(data), signal:AbortSignal.timeout(45000)});
    return {http_status:response.status, body:await response.json()};
  }, {base,endpoint,data});
}

/** 고정 공개 검색 사례와 실제/기록 데이터를 분리해 확인하고 선택적으로 인계 예시를 쓴다. */
async function main() {
  const server = http.createServer((request,response)=>{
    response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    response.end("<!doctype html><html lang='ko'><title>5173 API 연결 검사</title><p>팀 UI와 별개인 검사 페이지</p></html>");
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(5173,"127.0.0.1",resolve);});
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
    const page = await browser.newPage();
    page.on("requestfailed",request=>console.error("Browser network failure:",request.failure()?.errorText));
    await page.goto(front);
    const keywordRequest = {query:"청량리역",type:"keyword"};
    const keyword = await post(page,"/preview/places",keywordRequest);
    assert.equal(keyword.http_status,200);
    assert.equal(keyword.body.status,"ready");
    const selected = keyword.body.places.find(item=>item.label.includes("청량리역"));
    assert.ok(selected);
    assert.ok(selected.lat>37 && selected.lat<38 && selected.lng>126 && selected.lng<128);
    const addressRequest = {query:"서울 중구 세종대로 110",type:"address"};
    const address = await post(page,"/preview/places",addressRequest);
    assert.equal(address.http_status,200);
    assert.equal(address.body.status,"ready");
    assert.equal(address.body.places[0].type,"address");
    const invalid = await post(page,"/preview/places",{query:""});
    assert.equal(invalid.http_status,400);
    assert.equal(invalid.body.code,"invalid_query");
    const start_location = {label:selected.label,lat:selected.lat,lng:selected.lng};
    const minimumRequest = {request_kind:"place",start_location,start_at:"2026-10-31T14:00:00+09:00",
      end_at:"2026-10-31T14:59:00+09:00",category:"전시",mode:"recorded"};
    const short = await post(page,"/preview/recommend",minimumRequest);
    assert.equal(short.http_status,400);
    assert.equal(short.body.code,"minimum_duration");
    const minimum = await post(page,"/preview/recommend",{...minimumRequest,end_at:"2026-10-31T15:00:00+09:00"});
    assert.equal(minimum.http_status,200);
    const recommendRequest = {...minimumRequest,end_at:"2026-10-31T17:00:00+09:00",category:"국악",mode:"live"};
    const recommend = await post(page,"/preview/recommend",recommendRequest);
    assert.equal(recommend.http_status,200);
    assert.equal(recommend.body.status,"ready");
    assert.ok(recommend.body.candidates.length>0);
    for (const item of recommend.body.candidates) {
      for (const field of ["id","title","venue","lat","lng","distance_km","official_url","opening_info","price_info","fee_type","checks_required"])
        assert.ok(Object.hasOwn(item,field),field);
    }
    const courseRequest = {...recommendRequest,request_kind:"course",stay_minutes:30};
    const course = await post(page,"/preview/recommend",courseRequest);
    assert.equal(course.http_status,200);
    assert.ok(["ready","check","conflict","insufficient","unavailable"].includes(course.body.course.status));
    const denied = await page.request.post(base+"/preview/places",{headers:{Origin:"https://unlisted.example"},data:keywordRequest});
    assert.equal(denied.status(),403);
    if (process.argv.includes("--write-examples")) {
      const target=path.resolve(__dirname,"../../docs/development/examples");
      for (const [name,request,response] of [["place-search.keyword.live",keywordRequest,keyword],
        ["place-search.address.live",addressRequest,address],["recommend-selected-place.live",recommendRequest,recommend],
        ["course-selected-place.live",courseRequest,course]]) {
        await fs.writeFile(path.join(target,name+".json"),JSON.stringify({
          note:"고정 공개 장소의 조회 시점 실제 응답. 최신 결과나 팀 UI 연결 성공을 보장하지 않는다.",
          request,...response},null,2)+"\n","utf8");
      }
    }
    console.log(JSON.stringify({result:"PASS",front,keyword_count:keyword.body.places.length,address_count:address.body.places.length,
      recommendations:recommend.body.candidates.length,course_status:course.body.course.status,
      checks:["real keyword/address","selected coordinates to live recommendation","59 rejected / 60 allowed (recorded)",
        "browser CORS success/error","unlisted origin rejected"],team_ui_tested:false}));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
