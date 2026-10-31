/** 지도 위 내 위치 표시·갱신·중지를 제공한다. 사용자 클릭 후에만 위치 권한을 요청한다.
 * 위치는 화면 메모리에만 두며 서버 전송·저장·추천 조건 변경·경로 재탐색을 하지 않는다.
 */
window.installLocationControls = function installLocationControls(getMaps, getActiveMap) {
  let watchId=null, generation=0, current=null, expiry=null;
  const drawn=new Map(), controls=[];

  /** 위치 도형만 지우고 행사 핀과 경로는 유지한다. */
  function clearShapes() {
    for (const shapes of drawn.values()) shapes.forEach(shape=>shape.remove());
    drawn.clear();
  }

  /** 두 지도 화면의 상태와 버튼 문구를 같은 수집 상태로 갱신한다. */
  function status(message) {
    for (const item of controls) {
      item.note.textContent=message;
      item.toggle.textContent=watchId===null ? "내 위치 표시" : "위치 갱신 중지";
      item.toggle.setAttribute("aria-pressed",String(watchId!==null));
      item.center.disabled=!current;
    }
  }

  /** GPS 구독과 늦은 콜백을 무효화하고 위치 도형·기억·만료 타이머를 제거한다. */
  function stop(message="위치 표시를 중지했어요.") {
    const wasActive=watchId!==null || Boolean(current);
    generation++;
    if (watchId!==null) navigator.geolocation?.clearWatch(watchId);
    watchId=null;current=null;
    clearTimeout(expiry);expiry=null;
    clearShapes();
    if (wasActive || message!=="위치 표시를 중지했어요.") status(message);
  }

  /** 새 지도 생성/경로 전환에도 현재 위치와 정확도 반경을 별도 레이어로 그린다. */
  function refresh() {
    clearShapes();
    if (!current) return;
    for (const map of getMaps().filter(Boolean)) {
      drawn.set(map,[map.circle(current.point,current.accuracy),
        map.dot(current.point,{color:"#2674dc",radius:9,title:"내 위치"})]);
    }
  }

  /** 사용자가 켠 동안만 갱신한다. 오차·오래된 좌표·권한 실패를 현재 위치로 확정하지 않는다. */
  function start() {
    if (!getActiveMap() || !LabMap.ready) {status("지도를 연 뒤 내 위치 표시를 눌러 주세요.");return;}
    if (!window.isSecureContext || !navigator.geolocation) {
      status("이 환경에서 위치를 사용할 수 없어요. HTTPS 주소와 위치 권한을 확인해 주세요.");return;
    }
    const version=++generation;
    status("위치 권한을 확인하고 있어요.");
    try {
      watchId=navigator.geolocation.watchPosition(position=>{
        if (version!==generation) return;
        const {latitude:lat,longitude:lng,accuracy}=position.coords;
        const age=Date.now()-position.timestamp;
        if (![lat,lng,accuracy,age].every(Number.isFinite) || Math.abs(lat)>90 || Math.abs(lng)>180 || accuracy<0 || age>30000 || age< -5000) {
          stop("최신 위치를 확인하지 못했어요. 내 위치 표시를 다시 눌러 주세요.");return;
        }
        const first=!current;
        current={point:[lat,lng],accuracy};refresh();
        if (first) getActiveMap()?.panTo(current.point);
        const time=new Date(position.timestamp).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
        status("내 위치 갱신 중 · 정확도 약 "+Math.ceil(accuracy)+"m · "+time+(accuracy>100 ? " · 오차가 큰 위치예요." : ""));
        clearTimeout(expiry);
        expiry=setTimeout(()=>stop("위치 갱신이 멈춰 표시를 중지했어요. 다시 켜서 확인해 주세요."),Math.max(1,30000-age));
      },error=>{
        if (version!==generation) return;
        stop(error.code===1 ? "위치 권한이 거부됐어요. 브라우저에서 허용한 뒤 다시 눌러 주세요." :
          "위치를 확인하지 못했어요. 이동 안내는 계속 볼 수 있어요.");
      },{enableHighAccuracy:true,maximumAge:5000,timeout:10000});
      status("내 위치를 확인하고 있어요.");
    } catch {stop("위치를 확인하지 못했어요. 이동 안내는 계속 볼 수 있어요.");}
  }

  for (const box of document.querySelectorAll("[data-location-controls]")) {
    const toggle=document.createElement("button"), center=document.createElement("button"), note=document.createElement("p");
    toggle.type=center.type="button";toggle.dataset.locationToggle="";center.dataset.locationCenter="";
    center.textContent="내 위치로";note.setAttribute("role","status");note.className="muted location-note";
    toggle.onclick=()=>watchId===null ? start() : stop();
    center.onclick=()=>{if (current) getActiveMap()?.panTo(current.point);};
    box.append(toggle,center,note);controls.push({toggle,center,note});
  }
  status("위치를 허용하면 지도에 파란 점으로 표시해요. 출발 조건은 바뀌지 않아요.");
  document.addEventListener("visibilitychange",()=>{if (document.hidden) stop("화면을 벗어나 위치 표시를 중지했어요.");});
  window.addEventListener("pagehide",()=>stop());
  return {refresh,stop};
};
