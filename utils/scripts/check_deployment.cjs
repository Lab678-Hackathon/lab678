/** 배포용 환경변수로 임시 서버를 실행해 HTTP·화면·음성 fallback을 검증한다.
 * 실제 Render/Linux 배포를 대신하지 않는다. 외부 문화 조회 없이 기록 응답을 사용한다.
 * 실행: node utils/scripts/check_deployment.cjs (Playwright 및 CHROMIUM_PATH 필요).
 */
const assert = require("node:assert/strict");
const {spawn} = require("node:child_process");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 임시 서버가 출력한 포트를 읽는다. 시작 실패·시간 초과는 명시적으로 실패한다. */
function address(child) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Server startup timeout")),15000);
    let output="";
    child.once("error",error=>{clearTimeout(timer);reject(error);});
    child.once("exit",code=>{clearTimeout(timer);reject(new Error("Server exited: "+code));});
    child.stdout.on("data",data=>{
      output+=data.toString();
      const match=output.match(/http:\/\/0\.0\.0\.0:(\d+)/);
      if (match) {clearTimeout(timer);resolve("http://127.0.0.1:"+match[1]);}
    });
  });
}

/** 운영진 계정·키·실서비스 없이 배포 실행 설정과 사용자 핵심 경로를 함께 점검한다. */
async function main() {
  const publicOrigin="https://lab678-test.onrender.com";
  const child=spawn(process.env.PYTHON || "python",["backend/preview.py","--host","0.0.0.0"],{
    windowsHide:true,stdio:["ignore","pipe","pipe"],
    env:{...process.env,PORT:"0",RENDER_EXTERNAL_URL:publicOrigin,LAB678_ALLOWED_ORIGINS:"",LAB678_FILE_VOICE:"off"}
  });
  child.stderr.resume();
  let browser;
  try {
    const base=await address(child);
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    const health=await page.request.get(base+"/healthz");
    assert.equal(health.status(),200);
    assert.deepEqual(await health.json(),{status:"ok"});
    const data=await (await page.request.get(base+"/example")).json();
    data.mode="recorded";
    const success=await page.request.post(base+"/preview/recommend",{headers:{Origin:publicOrigin},data});
    assert.equal(success.status(),200);
    assert.ok((await success.json()).candidates.length>0);
    assert.equal(success.headers()["access-control-allow-origin"],publicOrigin);
    const denied=await page.request.post(base+"/preview/recommend",{headers:{Origin:publicOrigin+".evil.example"},data});
    assert.equal(denied.status(),403);
    const voice=await page.request.post(base+"/preview/voice",{headers:{Origin:publicOrigin},data:{text:"검증"}});
    assert.equal(voice.status(),503);
    assert.equal((await page.request.get(base+"/.local/transit.env")).status(),404);
    await page.goto(base + '/checks');
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    assert.equal(await page.locator("#file-read").isVisible(),false);
    assert.equal(await page.locator("#read").isEnabled(),true);
    assert.ok(await page.locator("#selection").getAttribute("data-id"));
    assert.deepEqual(errors,[]);
    console.log("PASS env PORT/listen address, health, configured HTTPS Origin, denied Origin, record recommendation+selection, file voice off/browser read available, private file 404");
  } finally {
    if (browser) await browser.close();
    if (child.exitCode===null) await new Promise(resolve=>{child.once("exit",resolve);child.kill();});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
