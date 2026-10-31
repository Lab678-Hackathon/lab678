# 음성·모바일 호환성 점검

2026-10-31 사용자 질문: 팀원 MacBook과 실제 모바일에서도 동작해야 한다. 화면 폭 검사와 기기 음성 호환 검증을 구분한다.

## 현재 근거

| 환경/항목 | 확인 범위 | 남은 확인 |
|---|---|---|
| Windows Chrome | 이전 사용자 단발 STT·TTS 성공, 자동반복/취소/파동은 모의 장치 검사 | 최신 자동 대화 실제 왕복 |
| MacBook Chrome | 표준 SpeechRecognition 또는 webkit 접두어 대응 | 실제 권한·한국어 STT·연속 TTS/재시작 |
| MacBook Safari | webkitSpeechRecognition 경로 모의 검사 | Siri/마이크 설정 영향 및 실제 음성 왕복 |
| Android Chrome | 모바일320/390px 화면 검사 | 실제 음성·TTS 재시작·키보드/지도 |
| iPhone Safari | 접두어 대응·모바일 화면 검사, 실기기 PASS 아님 | 실제 권한·TTS 뒤 마이크 재시작·무응답/탭 전환 |
| 음성 API 미지원 | 미지원 안내→같은 텍스트 대화 계속 모의 PASS | 대상 브라우저에서 실제 확인 |

SpeechRecognition은 널리 쓰이는 모든 브라우저에서 보장되는 기능이 아니다. Chrome의 서버 음성인식은 인터넷 연결이 필요하다. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

WebKit은 Safari 음성인식에 Siri 음성엔진을 사용하고 Siri 설정의 영향을 안내한다. 이 글은 Safari14.1 도입 당시의 공식 설명이며 현재 모든 OS 버전의 실제 성공을 입증하지 않는다. [WebKit](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/).

## 현재 대응과 실기기 검증

- `SpeechRecognition || webkitSpeechRecognition`으로 기능을 검사한다. 접두어 모의 성공을 Safari 실기기 성공으로 표시하지 않는다.
- 미지원/인식 실패 시 직접 입력 또는 기기 키보드 받아쓰기를 안내한다. 입력·대화는 유지한다. 이것이 모든 모바일에서 자동 음성 대화를 보장하는 것은 아니다.
- 사용자 클릭으로 시작하고 마이크·TTS를 동시에 열지 않는다. 탭 숨김/중지/권한·통신 오류에서 멈추고 늦은 콜백을 폐기한다. 무응답·TTS 타임아웃이 있다.
- 파동은 audio 수집 시작/끝과 발화 이벤트를 사용한다. 권한 대기/답변 처리/TTS/꺼짐에서 파동을 끈다. 시스템 ‘움직임 줄이기’에는 정적 원과 상태 글자를 제공한다. 음량 측정 애니메이션은 아니다.
- 실제 휴대폰에서는 패치를 재배포한 **공개 HTTPS URL**로 검사한다. `127.0.0.1`은 각 기기 자신이므로 개발 PC의5175 주소를 휴대폰에서 그대로 쓰지 않는다.

한 구간으로 묶어 MacBook Chrome·Android Chrome·iPhone Safari에서 `홈→마이크허용→2턴 대화→중지/재시작→조건확인→추천/상세`를 확인한다. 이어 잠금/탭 전환 후 마이크가 계속 듣지 않는지 확인한다. 실패는 OS·브라우저 버전·화면 오류와 함께 기록하고 다른 기기의 성공으로 대체하지 않는다.

브라우저 제한을 줄이는 서버 STT(녹음→서버 전사)는 후속 기술 선택지이며 현재 구현하지 않았다. 기기별 자동 음성 필수 요구를 지원 대상으로 축소한 것이 아니다.
