/** 팀 S02→S02a→API→S03→S04를 실제 프록시로 검증한다. 팀 소스를 수정하지 않는다.
 * 실행: node utils/scripts/check_team_flow.cjs (PLAYWRIGHT_MODULE/CHROMIUM_PATH 선택)
 * 준비: 팀 dev_server.py(5173)와 backend/preview.py(8765). 결과/캡처는 .local/qa01-team/.
 * recorded와 미래 날짜 live는 실제 서버, 오류 화면은 명시적 모의 응답으로 분리한다.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const front = process.env.LAB678_FRONT_URL || 'http://127.0.0.1:5173';
const output = path.resolve(__dirname,'../../.local/qa01-team');
const report = {front,front_ref:process.env.LAB678_FRONT_REF || 'unspecified',cases:[],team_source_modified:false};
let browser;

/** 독립 세션으로 실제 팀 화면을 열고 고정 QA 입력을 채운다. */
async function form(mode='recorded',day='2026-10-31',chooseStart=true) {
  const page=await browser.newPage({viewport:{width:412,height:915},timezoneId:'Asia/Seoul'});
  await page.goto(`${front}/?mode=${mode}&debug=1&season=none#/search`,{waitUntil:'domcontentloaded'});
  await page.locator('#f-date').fill(day);
  await page.locator('#f-start').fill('14:00');
  await page.locator('#f-end').fill('17:00');
  await page.locator('[data-category="전시"]').click();
  if (chooseStart) await page.locator('[data-start-key="cheongnyangni"]').click();
  return page;
}

/** 확인 영역을 먼저 펼치고 두 번째 클릭으로 API 응답을 기다린다. */
async function submit(page) {
  await page.locator('#btn-search').click();
  await page.locator('#confirm').waitFor({state:'visible'});
  const received=page.waitForResponse(r=>r.url().endsWith('/preview/recommend') && r.request().method()==='POST');
  await page.locator('#btn-search').click();
  const response=await received;
  return {http_status:response.status(),body:await response.json(),request:response.request().postDataJSON()};
}

/** 서로 다른 검사 결과를 보존해 한 실패가 다른 항목의 증거 수집을 막지 않게 한다. */
async function check(name,source,task) {
  try {report.cases.push({name,source,result:'PASS',...await task()});}
  catch(error) {report.cases.push({name,source,result:'FAIL',error:String(error.message)});}
}

/** 실제 S03 카드와 S04 상세의 ID/제목을 비교하고 두 화면을 캡처한다. */
async function detail(page,body,prefix) {
  await page.waitForURL('**#/results');
  const cards=page.locator('#s03-list .place-card');
  await cards.first().waitFor();
  const ids=await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  assert.deepEqual(ids,body.candidates.map(c=>c.id));
  const first=body.candidates[0];
  const mapUnavailable=await page.locator('#s03-map-error').isVisible();
  await page.screenshot({path:path.join(output,`${prefix}-s03.png`),fullPage:true});
  await cards.first().getByRole('button',{name:'자세히 보기'}).click();
  await page.locator('#s04 .place-title').waitFor();
  assert.equal(await page.locator('#s04 .place-title').textContent(),first.title);
  assert.equal(await page.locator('#s04-pick').getAttribute('data-id'),first.id);
  assert.ok((await page.locator('#s04-body .debug-id').textContent()).includes(first.id));
  if (first.price_info===null) {
    const price=page.locator('#s04 .info__row').filter({hasText:'가격'});
    assert.ok((await price.textContent()).includes('확인 필요'));
  }
  await page.locator('#s04-pick').click();
  assert.equal(await page.locator('#s04-pick').textContent(),'선택했어요');
  await page.screenshot({path:path.join(output,`${prefix}-s04.png`),fullPage:true});
  return {api_candidate_ids:ids,s03_selected_id:first.id,s04_detail_id:first.id,map_unavailable:mapUnavailable};
}

/** 고정 QA·입력 경계·예외·미래 조회를 묶어 검사하고 세션과 브라우저를 종료한다. */
async function main() {
  await fs.mkdir(output,{recursive:true});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    await check('QA-01 recorded','real backend / recorded source',async()=>{
      const page=await form();
      const r=await submit(page);
      assert.equal(r.http_status,200);assert.equal(r.body.mode,'recorded');
      assert.deepEqual(r.request,{request_kind:'place',start_location:{label:'청량리역',lat:37.5805961,lng:127.0482573},
        start_at:'2026-10-31T14:00:00+09:00',end_at:'2026-10-31T17:00:00+09:00',category:'전시',mode:'recorded'});
      const result=await detail(page,r.body,'recorded');
      await page.locator('#s04 [data-go="/results"]').click();
      await page.locator('#s03 .bottombar [data-go="/search"]').click();
      assert.equal(await page.locator('#f-end').inputValue(),'17:00');
      assert.equal(await page.locator('[data-start-key="cheongnyangni"]').getAttribute('aria-pressed'),'true');
      return {...result,request:r.request,conditions_preserved:true};
    });
    await check('출발지 미선택·59/60분','real UI / recorded source',async()=>{
      const page=await form('recorded','2026-10-31',false);
      let count=0;page.on('request',r=>{if(r.url().endsWith('/preview/recommend'))count++;});
      await page.locator('#btn-search').click();
      assert.equal(await page.locator('#err-start').isVisible(),true);assert.equal(count,0);
      await page.locator('[data-start-key="cheongnyangni"]').click();
      await page.locator('#f-end').fill('14:59');await page.locator('#f-end').blur();
      await page.locator('#btn-search').click();
      assert.ok((await page.locator('#err-time').textContent()).includes('최소 1시간'));assert.equal(count,0);
      await page.locator('#f-end').fill('15:00');await page.locator('#f-end').blur();
      const r=await submit(page);assert.equal(r.http_status,200);
      await page.waitForURL('**#/results');
      return {missing_start_blocked:true,minutes_59_blocked:true,minutes_60_http:r.http_status};
    });
    await check('정상 0건','mock response / real UI',async()=>{
      const page=await form();
      await page.route('**/preview/recommend',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        status:'no_results',mode:'recorded',candidates:[],source_total:0,searched_count:0,source_checked_at:'2026-10-31T14:00:00+09:00'})}));
      await submit(page);await page.waitForURL('**#/results');
      assert.equal(await page.locator('#s03-empty').isVisible(),true);
      assert.equal(await page.locator('#s03-found').isVisible(),false);
      return {mock_fallback:false,api_candidate_ids:[]};
    });
    for (const status of [400,502]) await check(`${status} 오류`,'mock response / real UI',async()=>{
      const page=await form();
      const message=status===400?'나들이 시간은 최소 1시간 이상으로 설정해 주세요.':'문화정보 조회에 실패했습니다.';
      await page.route('**/preview/recommend',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({status:status===400?'need_input':'error',message})}));
      await submit(page);await page.locator('#confirm-error').waitFor({state:'visible'});
      assert.equal(await page.locator('#confirm-error').textContent(),message);
      assert.ok(page.url().endsWith('#/search'));
      assert.equal(await page.locator('#f-end').inputValue(),'17:00');
      assert.equal(await page.locator('#s03-list .place-card').count(),0);
      return {input_preserved:true,mock_fallback:false};
    });
    await check('네트워크 실패','mock network abort / real UI',async()=>{
      const page=await form();
      await page.route('**/preview/recommend',route=>route.abort('failed'));
      await page.locator('#btn-search').click();await page.locator('#btn-search').click();
      await page.locator('#confirm-error').waitFor({state:'visible'});
      assert.ok((await page.locator('#confirm-error').textContent()).includes('인터넷 연결'));
      assert.equal(await page.locator('#f-end').inputValue(),'17:00');
      assert.equal(await page.locator('#s03-list .place-card').count(),0);
      return {input_preserved:true,mock_fallback:false};
    });
    const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
    const tomorrow=new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10);
    await check('미래 날짜 live','real backend / live source',async()=>{
      const page=await form('live',tomorrow);
      const r=await submit(page);assert.equal(r.http_status,200);assert.equal(r.body.mode,'live');
      assert.ok(['ready','no_results'].includes(r.body.status));
      if (r.body.status==='ready') return {day:tomorrow,...await detail(page,r.body,'live'),source_checked_at:r.body.source_checked_at};
      await page.waitForURL('**#/results');assert.equal(await page.locator('#s03-empty').isVisible(),true);
      return {day:tomorrow,status:'no_results',api_candidate_ids:[],s03_selected_id:null,s04_detail_id:null};
    });
  } finally {
    report.checked_at=new Date().toISOString();
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
  console.log(JSON.stringify(report,null,2));
  if(report.cases.some(c=>c.result==='FAIL'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
