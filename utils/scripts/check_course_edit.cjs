/** 제외 예정/취소에는 요청이 없고 명시적 재생성에서만 제외 조건이 전달되는지 검사한다.
 * 문화 후보는 기록 응답, 일정 및 실패 결과는 모의 자료다. 실제 이동시간 검증과 구분한다.
 */
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 표시 중인 코스와 선택을 보존하면서 제외 초안과 적용 결과가 구분되는지 확인한다. */
async function main() {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto("http://127.0.0.1:8765/checks");
    const request=await (await page.request.get("http://127.0.0.1:8765/example")).json();
    const original=await (await page.request.post("http://127.0.0.1:8765/preview/recommend",{data:{...request,mode:"recorded"}})).json();
    assert.ok(original.candidates.length>=3);
    let behavior="ready";
    const sent=[];
    await page.route("**/preview/recommend",route=>{
      const data=route.request().postDataJSON(); sent.push(data);
      if (behavior==="failure") return route.fulfill({status:502,json:{status:"error",message:"모의 재생성 실패"}});
      if (behavior!=="ready") return route.fulfill({json:{...original,course:{status:behavior,message:"모의 새 코스 미확인"}}});
      const pair=original.candidates.filter(item=>!data.exclude_ids.includes(item.id)).slice(0,2);
      return route.fulfill({json:{...original,course:{status:"ready",message:"모의 검증 코스",ids:pair.map(item=>item.id),
        venues:pair.map(item=>item.venue),walk_minutes:[10,10],stops:pair.map(item=>({id:item.id,title:item.title,
          arrive:"14:10",begin:"14:10",finish:"14:40",walk_min:10}))}}});
    });
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="kind"]').selectOption("course");
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#course-edit").waitFor();
    assert.equal(sent.length,1);
    const ids=await page.locator("#list > li").evaluateAll(items=>items.map(item=>item.dataset.id));
    const course=await page.locator("#course-text").textContent();
    await page.getByRole("button",{name:"이 장소 제외",exact:true}).first().click();
    assert.equal(sent.length,1);
    assert.equal(await page.locator("#course-text").textContent(),course);
    assert.deepEqual(await page.locator("#list > li").evaluateAll(items=>items.map(item=>item.dataset.id)),ids);
    await page.getByRole("button",{name:"제외 취소",exact:true}).click();
    assert.equal(sent.length,1);
    assert.equal(await page.locator("#rebuild-course").isEnabled(),false);
    await page.getByRole("button",{name:"이 장소 제외",exact:true}).first().click();
    await page.locator("#course-result").screenshot({path:".local/course-exclusion-pending.png"});
    await page.locator("#rebuild-course").click();
    await page.waitForFunction(id=>![...document.querySelectorAll("#list > li")].some(item=>item.dataset.id===id),ids[0]);
    assert.equal(sent.length,2);
    assert.deepEqual(sent[1].exclude_ids,[ids[0]]);
    assert.equal(await page.getByRole("button",{name:"제외 취소",exact:true}).count(),0);
    assert.equal(await page.locator("#rebuild-course").isEnabled(),false);
    const nextIds=await page.locator("#list > li").evaluateAll(items=>items.map(item=>item.dataset.id));
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    for (const failure of ["failure","insufficient","check","conflict"]) {
      behavior=failure;
      await page.getByRole("button",{name:"이 장소 제외",exact:true}).first().click();
      const count=sent.length;
      await page.locator("#rebuild-course").click();
      await page.locator("#course-rebuild-status").filter({hasText:"보관"}).waitFor();
      assert.equal(sent.length,count+1);
      assert.deepEqual(sent.at(-1).exclude_ids,[ids[0],nextIds[0]]);
      assert.deepEqual(await page.locator("#list > li").evaluateAll(items=>items.map(item=>item.dataset.id)),nextIds);
      assert.equal(await page.locator("#selection").getAttribute("data-id"),nextIds[0]);
      assert.equal(await page.locator("#results").isVisible(),true);
      await page.getByRole("button",{name:"제외 취소",exact:true}).click();
      assert.equal(await page.locator("#rebuild-course").isEnabled(),false);
    }
    assert.deepEqual(errors,[]);
    console.log("PASS exclusion toggle sends no request; explicit rebuild passes IDs; success applies; failure/insufficient/check/conflict preserves course+selection");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
