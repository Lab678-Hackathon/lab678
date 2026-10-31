/** 카카오 지도 우선 표시와 기존 지도 대체를 제공하는 개인 점검용 어댑터.
 * 경로를 계산하지 않고 공급자가 반환한 좌표만 그린다. 키/좌표를 저장하거나 로그하지 않는다.
 */
window.LabMap = (() => {
  let provider = null;
  let notice = "지도를 불러오는 중이에요.";

  /** 허용된 지도 SDK를 제한 시간 안에 불러온다. 설정/네트워크 실패는 호출자에게 전달한다. */
  function script(url, integrity) {
    return new Promise((resolve,reject) => {
      const element=document.createElement("script");
      const timer=setTimeout(()=>{element.remove();reject(new Error("map timeout"));},8000);
      element.src=url;
      if (integrity) {element.integrity=integrity;element.crossOrigin="anonymous";}
      element.onload=()=>{clearTimeout(timer);resolve();};
      element.onerror=()=>{clearTimeout(timer);element.remove();reject(new Error("map load failed"));};
      document.head.append(element);
    });
  }

  /** 공개 JS 키로 카카오를 준비하고 실패하면 명시적 안내와 함께 기존 지도를 사용한다. */
  async function load() {
    try {
      const response=await fetch("/map-config",{signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error("map config failed");
      const config=await response.json();
      if (config.provider==="kakao" && /^[a-f0-9]{32}$/i.test(config.javascript_key)) {
        await script("https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey="+encodeURIComponent(config.javascript_key));
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error("kakao timeout")),8000);
          if (!window.kakao?.maps?.load) {clearTimeout(timer);reject(new Error("kakao unavailable"));return;}
          window.kakao.maps.load(()=>{clearTimeout(timer);resolve();});
        });
        provider="kakao";notice="";
      }
    } catch {notice="카카오 지도를 불러오지 못해 기본 지도로 표시해요.";}
    if (!provider) {
      try {
        await script("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=");
        if (!window.L) throw new Error("leaflet unavailable");
        provider="leaflet";
        if (notice==="지도를 불러오는 중이에요.") notice="";
      } catch {notice="지도를 불러올 수 없으면 아래 행사 목록을 이용해 주세요.";}
    }
    document.documentElement.dataset.mapProvider=provider || "unavailable";
  }

  /** 지도 인스턴스에 핀·선·원·범위 조절·정리 기능을 제공한다. 좌표는 [위도, 경도]. */
  function create(box, onError = () => {}) {
    if (!provider) throw new Error("지도 준비를 기다려 주세요.");
    const kakaoMode=provider==="kakao", sdk=kakaoMode ? window.kakao.maps : window.L;
    const layers=new Set();
    const ll=point=>new sdk.LatLng(point[0],point[1]);
    let native=kakaoMode ? new sdk.Map(box,{center:ll([37.5665,126.978]),level:7}) : sdk.map(box);
    box.dataset.provider=provider;
    if (kakaoMode) native.addControl(new sdk.ZoomControl(),sdk.ControlPosition.RIGHT);
    else sdk.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:19
    }).on("tileerror",onError).addTo(native);

    /** 개별 도형/마커의 정리와 선택 강조용 최소 인터페이스를 제공한다. */
    function track(layer,point,element) {
      if (kakaoMode) layer.setMap(native); else layer.addTo(native);
      const wrapped={remove(){if (kakaoMode) layer.setMap(null);else layer.remove();layers.delete(wrapped);},
        getElement:()=>element || layer.getElement?.(),getLatLng:()=>point};
      layers.add(wrapped);
      return wrapped;
    }

    return {
      invalidateSize(){if (kakaoMode) native.relayout();else native.invalidateSize();},
      panTo(point){if (kakaoMode) native.panTo(ll(point));else native.panTo(point,{animate:false});},
      fitBounds(points,options={}) {
        if (!points.length) return;
        if (kakaoMode) {
          const bounds=new sdk.LatLngBounds();points.forEach(point=>bounds.extend(ll(point)));
          native.setBounds(bounds,28,28,28,28);
          const minimum=options.maxZoom>=17 ? 2 : 4;
          if (native.getLevel()<minimum) native.setLevel(minimum);
        } else native.fitBounds(points,{padding:[28,28],maxZoom:options.maxZoom || 17,animate:false});
      },
      pin(point,{number,title="",onClick}={}) {
        if (kakaoMode) {
          const element=document.createElement(onClick ? "button" : "span");
          element.className=number ? "event-pin kakao-pin" : "route-pin";
          element.textContent=number || "●";element.title=title;
          element.setAttribute("aria-label",title);
          if (onClick) {element.type="button";element.onclick=event=>{event.stopPropagation();onClick();};}
          return track(new sdk.CustomOverlay({position:ll(point),content:element,yAnchor:.5,zIndex:3}),point,element);
        }
        const options={title,alt:title};
        if (number) options.icon=sdk.divIcon({className:"event-pin",html:String(number),iconSize:[26,26]});
        const layer=sdk.marker(point,options);
        if (onClick) layer.on("click",onClick);
        return track(layer,point);
      },
      line(points,{color="#007385",weight=5,dashed=false}={}) {
        return track(kakaoMode ? new sdk.Polyline({path:points.map(ll),strokeColor:color,strokeWeight:weight,strokeOpacity:1,strokeStyle:dashed ? "dash" : "solid"}) :
          sdk.polyline(points,{color,weight,dashArray:dashed ? "7 7" : null}));
      },
      dot(point,{color="#aa5100",radius=8,title=""}={}) {
        if (kakaoMode) {
          const element=document.createElement("span");element.className="route-dot";
          element.style.cssText="display:block;border-radius:50%;background:"+color+";border:2px solid white;width:"+(radius*2)+"px;height:"+(radius*2)+"px";
          element.title=title; element.setAttribute("aria-label",title);
          return track(new sdk.CustomOverlay({position:ll(point),content:element,yAnchor:.5,zIndex:4}),point,element);
        }
        const layer=sdk.circleMarker(point,{color,radius});
        if (title) {const content=document.createElement("span");content.textContent=title;layer.bindPopup(content);}
        return track(layer,point);
      },
      circle(point,meters) {
        return track(kakaoMode ? new sdk.Circle({center:ll(point),radius:meters,strokeColor:"#2674dc",strokeWeight:1,fillColor:"#2674dc",fillOpacity:.12}) :
          sdk.circle(point,{radius:meters,color:"#2674dc",weight:1,fillOpacity:.12}));
      },
      remove(){for (const layer of [...layers]) layer.remove();if (!kakaoMode) native.remove();box.replaceChildren();native=null;}
    };
  }
  return {load,create,get ready(){return Boolean(provider && (provider==="kakao" ? window.kakao?.maps?.Map : window.L));},get notice(){return notice;}};
})();
