/** 추천 재요청의 실패·추가0건·취소·늦은 응답에서 카드/선택/조건 보존을 검증한다.
 * 문화 후보는 기록 응답, 코스 시각/실패/지연은 모의 자료이며 실제 일정 검증과 구분한다.
 */
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** 같은 화면의 결과를 성공 응답에서만 교체하고 이전 요청이 늦게 도착해도 무시하는지 검사한다. */
async function main() {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on("pageerror", error=>errors.push(error.message));
    await page.goto("http://127.0.0.1:8765");
    const request=await (await page.request.get("http://127.0.0.1:8765/example")).json();
    const body=await (await page.request.post("http://127.0.0.1:8765/preview/recommend",{data:{...request,mode:"recorded"}})).json();
    const pair=body.candidates.slice(0,2);
    const original={...body,course:{status:"ready",message:"모의 두 곳 일정",ids:pair.map(item=>item.id),
      venues:pair.map(item=>item.venue),walk_minutes:[10,10],stops:pair.map(item=>({id:item.id,title:item.title,
        arrive:"14:10",begin:"14:10",finish:"14:40",walk_min:10}))}};
    let behavior="ready";
    await page.route("**/preview/recommend",route=> {
      if (behavior === "failure") return route.fulfill({status:502,json:{status:"error",message:"모의 조회 실패"}});
      if (behavior === "empty") return route.fulfill({json:{...body,status:"no_results",candidates:[]}});
      if (behavior === "course-failure") return route.fulfill({json:{...body,course:{status:"unavailable",message:"모의 도보 조회 실패"}}});
      if (behavior === "invalid") return route.fulfill({json:{...original,course:{...original.course,ids:["missing-id"]}}});
      return route.fulfill({json:original});
    });
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.locator('[name="kind"]').selectOption("course");
    await page.locator('[name="mode"]').selectOption("recorded");
    await page.locator('[name="note"]').fill("전시 두 곳 코스");
    const submit=page.getByRole("button",{name:"추천받기",exact:true});
    await submit.click();
    await page.locator("#results").waitFor();
    await page.getByRole("button",{name:"이 행사 선택",exact:true}).first().click();
    const selected=await page.locator("#selection").getAttribute("data-id");
    const cards=await page.locator("#list").innerHTML();
    const course=await page.locator("#course-text").textContent();
    const links=await page.locator("#event-directions").innerHTML();
    for (const failure of ["failure","empty","course-failure","invalid"]) {
      behavior=failure;
      await page.locator("#back").click();
      await page.locator('[name="start"]').fill("2026-10-31T13:00");
      await submit.click();
      await page.locator("#status").filter({hasText:"보관"}).waitFor();
      assert.equal(await page.locator("#list").innerHTML(),cards);
      assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
      assert.equal(await page.locator("#course-text").textContent(),course);
      assert.equal(await page.locator('[name="start"]').inputValue(),"2026-10-31T13:00");
      await page.locator("#restore-recommendation").click();
      assert.equal(await page.locator('[name="start"]').inputValue(),"2026-10-31T14:00");
      assert.equal(await page.locator('[name="note"]').inputValue(),"전시 두 곳 코스");
      assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
      assert.equal(await page.locator("#event-directions").innerHTML(),links);
      assert.equal(await page.locator("#file-read").isEnabled(),true);
    }
    behavior="failure";
    await page.getByRole("button",{name:"이 장소 제외",exact:true}).first().click();
    await page.getByRole("button",{name:"코스 다시 만들기",exact:true}).click();
    await page.locator("#status").filter({hasText:"보관"}).waitFor();
    await page.locator("#restore-recommendation").click();
    assert.deepEqual(await page.evaluate(()=>excludedIds),[]);
    assert.equal(await page.locator("#selection").getAttribute("data-id"),selected);
    // 요청 취소를 무시하는 모의 공급자로 늦은 응답이 도착해도 최신 결과를 덮지 않는지 확인한다.
    await page.evaluate(({oldBody,newBody})=>{
      const fetchOriginal=window.fetch.bind(window);
      let count=0;
      window.fetch=(url,options)=>{
        if (String(url).endsWith("/preview/recommend")) {
          count++;
          if (count===1) return new Promise(resolve=>{window.releaseOldResult=()=>resolve(new Response(JSON.stringify(oldBody),{status:200}));});
          return Promise.resolve(new Response(JSON.stringify(newBody),{status:200}));
        }
        return fetchOriginal(url,options);
      };
    },{oldBody:original,newBody:{...body,candidates:[{...body.candidates[0],title:"새 응답 확인용 행사"}]}});
    await page.locator("#back").click();
    await submit.click();
    await page.locator("#cancel-recommendation").waitFor();
    await page.locator("#cancel-recommendation").click();
    await page.locator('[name="kind"]').selectOption("place");
    await submit.click();
    await page.locator("#list strong").filter({hasText:"새 응답 확인용 행사"}).waitFor();
    await page.evaluate(async()=>{window.releaseOldResult();await new Promise(resolve=>setTimeout(resolve,0));});
    assert.equal(await page.locator("#list li").count(),1);
    assert.match(await page.locator("#list strong").textContent(),/새 응답 확인용 행사/);
    assert.equal(await page.locator("#cancel-recommendation").isVisible(),false);
    behavior="empty";
    await page.reload();
    await page.getByRole("button",{name:"나들이 찾기",exact:true}).click();
    await page.getByRole("button",{name:"추천받기",exact:true}).click();
    await page.locator("#results").waitFor();
    assert.equal(await page.locator("#list li").count(),0);
    assert.match(await page.locator("#status").textContent(),/맞는 행사가 없습니다/);
    assert.equal(await page.locator("#restore-recommendation").isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log("PASS simulated failure/zero/course-failure/invalid result preservation, condition+selection restore, cancelled stale response ignored");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
