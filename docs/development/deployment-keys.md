# 공공데이터·Naito 배포 키 처리

실제 키는 `.local/*.env`에만 두고 Git·프론트 JavaScript·인계 ZIP에 포함하지 않는다. 서버는 이미 환경변수를 우선 읽는다. 배포 시 로컬 키 파일을 업로드하지 않고 기존 Render 서비스의 환경변수에 아래 이름/값을 등록한다. 이 문서/예시에는 실제 값이 없다.

| 환경변수 | 사용처 | 공개 여부 |
|---|---|---|
| `LAB678_NAITO_API_KEY` | Naito 조건 해석 | 서버 비밀 |
| `LAB678_NAITO_MODEL` | 기본 `claude-sonnet-4` | 비밀 아님 |
| `LAB678_SEOUL_API_KEY` | 서울 문화정보 | 서버 비밀 |
| `LAB678_TOUR_API_KEY` | 공공데이터포털 국문 TourAPI | 서버 비밀 |
| `LAB678_KAKAO_REST_API_KEY` | 장소·대중교통 | 서버 비밀 |
| `LAB678_KAKAO_JAVASCRIPT_KEY` | 선택 지도 SDK | 브라우저에 공개되는 별도 JS 키 |

[등록 목록 예시](../../backend/deploy.env.example). Vercel의 프론트 코드에는 위 서버 비밀키를 넣지 않는다. 프론트는 백엔드 API 주소를 사용하며 비밀키가 필요한 외부 호출은 backend에서 처리한다. 브라우저 STT/TTS는 Naito/공공데이터 키를 사용하지 않는다.

Render의 Secret Files는 `/etc/secrets/<파일명>`에 제공되지만 현재 코드는 해당 경로를 자동으로 읽지 않으므로 **환경변수 등록 방식을 사용**한다. `.env` 예시는 등록 이름 안내이며 자동 배포 파일이 아니다. [Render 공식 환경변수·비밀 파일 안내](https://render.com/docs/configure-environment-variables).

## 확인한 것과 남은 일

- [x] 코드의 환경변수 우선 읽기와 Git 제외 설정 확인.
- [x] 실제 키가 아닌 가짜 값으로 서울시/TourAPI/Naito/REST 환경 우선·일부 명시적 빈 키 동작 검사.
- [x] 공유할 변경 파일 및 Push 대상 Git 객체에서 로컬 비밀값 대조. 실제 값은 출력/기록하지 않음.
- [ ] **실제 Render 환경변수 등록/현재 등록 상태 확인** — 콘솔 접근 담당자.
- [ ] 등록한 모델·키 권한 확인 후 기존 backend 수동 재배포.
- [ ] 배포본의 AI·서울시·TourAPI·장소/교통 실호출과 오류·0건 구분, 프론트 CORS/HTTPS 확인.

콘솔 키 등록·재배포를 아직 수행하지 않았다. 환경변수 단위검사 PASS는 실제 배포 성공이 아니다. 새 PRD/화면명세 구현은 다음 작업이며 이번 공유에 포함하지 않는다.
