/** 서로 다른 로컬 포트에서 브라우저 CORS·입력 오류·상세 필드를 검증한다.
 * 실제 팀 UI 대신 테스트 페이지만 띄우고 전용 임시 서버/브라우저는 종료 시 정리한다.
 * 실행: node utils/scripts/check_frontend_connection.cjs (기존 Playwright 환경 필요).
 */
const assert = require("node:assert/strict");
const http = require("node:http");
const {spawn} = require("node:child_process");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 빈 포트에서 연결 확인용 HTML만 제공한다. 팀 프론트 파일은 만들거나 수정하지 않는다. */
async function startPage() {
  const server = http.createServer((request,response) => {
    response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    response.end("<!doctype html><html lang='ko'><title>API 연결 검증</title><p>연결 검증용 페이지</p></html>");
  });
  await new Promise((resolve,reject) => {server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  return {server,origin:"http://127.0.0.1:"+server.address().port};
}

/** 점검 서버가 공개한 로컬 주소만 읽고 제한 시간 안에 준비되지 않으면 실패한다. */
function backendAddress(process) {
  return new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error("Backend startup timed out")),15000);
    let output="";
    process.once("error",error=>{clearTimeout(timer);reject(error);});
    process.once("exit",code=>{clearTimeout(timer);reject(new Error("Backend exited: "+code));});
    process.stdout.on("data",chunk=>{
      output+=chunk.toString();
      const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {clearTimeout(timer);resolve(match[0]);}
    });
  });
}

/** JSON POST를 실제 브라우저에서 수행해 정상 응답과 오류 응답 모두 읽히는지 확인한다. */
async function main() {
  const front=await startPage();
  let denied,backend,browser;
  try {
    denied=await startPage();
    backend=spawn(process.env.PYTHON || "python",["backend/preview.py","--port","0"],{
      windowsHide:true,stdio:["ignore","pipe","pipe"],
      env:{...process.env,LAB678_ALLOWED_ORIGINS:front.origin}
    });
    backend.stderr.resume();
    const base=await backendAddress(backend);
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
    const page=await browser.newPage();
    await page.goto(front.origin);
    const request=await (await page.request.get(base+"/example")).json();
    request.mode="recorded";
    const result=await page.evaluate(async({base,request})=>{
      const response=await fetch(base+"/preview/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
      return {status:response.status,body:await response.json()};
    },{base,request});
    assert.equal(result.status,200);
    assert.ok(result.body.candidates.length>0);
    for (const item of result.body.candidates) {
      assert.match(item.event_start_date,/^\d{4}-\d{2}-\d{2}$/);
      assert.match(item.event_end_date,/^\d{4}-\d{2}-\d{2}$/);
      assert.equal(item.address,null);
      assert.ok(Object.hasOwn(item,"district"));
    }
    const invalid=await page.evaluate(async({base,request})=>{
      request.end_at="2026-10-31T14:59:00+09:00";
      const response=await fetch(base+"/preview/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
      return {status:response.status,body:await response.json()};
    },{base,request});
    assert.equal(invalid.status,400);
    assert.equal(invalid.body.code,"minimum_duration");
    const preflight=await page.request.fetch(base+"/preview/recommend",{method:"OPTIONS",headers:{
      Origin:front.origin,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type"
    }});
    assert.equal(preflight.status(),204);
    assert.equal(preflight.headers()["access-control-allow-origin"],front.origin);
    assert.equal(preflight.headers()["access-control-allow-credentials"],undefined);
    const deniedResponse=await page.request.post(base+"/preview/recommend",{headers:{Origin:denied.origin},data:request});
    assert.equal(deniedResponse.status(),403);
    assert.equal(deniedResponse.headers()["access-control-allow-origin"],undefined);
    await page.goto(denied.origin);
    const blocked=await page.evaluate(async({base,request})=>{
      try {await fetch(base+"/preview/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});return false;}
      catch {return true;}
    },{base,request});
    assert.equal(blocked,true);
    console.log("PASS separate-port browser JSON POST, readable HTTP400, OPTIONS, denied origin, source dates/district/null address");
  } finally {
    if (browser) await browser.close();
    if (backend && backend.exitCode === null) {
      await new Promise(resolve=>{backend.once("exit",resolve);backend.kill();});
    }
    for (const item of [front,denied]) if (item) await new Promise(resolve=>item.server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
