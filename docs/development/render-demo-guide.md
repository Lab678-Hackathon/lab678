# Render 단일 서비스 시연 준비

2026-10-31 · 개인 점검 화면/백엔드 배포 준비 · **로컬 검사 완료, 실제 Render 배포 미실시**

현재 화면과 Python 서버를 한 주소에서 제공하는 구성이다. Vercel·GitHub Pages를 먼저 연결할 필요는 없다. 최종 팀 UI 교체는 별도 통합이며 공용 배포 결정/자동배포 설정을 이 문서가 확정하지 않는다.

## 준비된 실행 설정

| Render 항목 | 입력값/설명 |
|---|---|
| 종류 | Web Service, Python 3 |
| 저장소 | Lab678-Hackathon/lab678 |
| 브랜치 | 개인 시연 준비는 dj/develop의 검증된 커밋을 push한 뒤 선택. 최종 main은 팀장 승인 절차 적용 |
| Root Directory | 비움. backend 밖의 기록 응답/요청 파일도 필요 |
| Build Command | `python -m compileall -q backend` (현재 표준 라이브러리만 사용) |
| Start Command | `python -u backend/preview.py --host 0.0.0.0` |
| Health Check Path | `/healthz` |
| 자동 배포 | 준비 단계에서는 끄고 검증한 커밋을 수동 배포 |
| 요금제 | Free로 시험 가능. 유료 선택은 별도 결정 |

공식 문서: [Web Services](https://render.com/docs/web-services), [환경변수](https://render.com/docs/environment-variables), [무료 서비스 제한](https://render.com/docs/free).

Render가 지정한 `PORT`를 읽는다. 로컬 기본은 계속 `127.0.0.1:8765`이며 `--port`로 덮어쓸 수 있다. `/healthz`는 외부 API를 호출하지 않는 프로세스 확인이다. health 성공이 문화/교통 API 성공을 의미하지 않는다.

## 환경변수 (실제 키는 Render 관리 화면에만 입력)

| 이름 | 설정 |
|---|---|
| `LAB678_FILE_VOICE` | `off`. Windows 전용 WAV 합성 버튼을 숨기고 서버 합성도 비활성화 |
| `LAB678_KAKAO_REST_API_KEY` | 대중교통 연결에 쓸 실제 키를 비밀 환경변수로 등록. 로컬 `.local/transit.env`는 업로드하지 않음 |
| `RENDER_EXTERNAL_URL` | Render가 자동 제공하는 공개 URL. 이 정확한 HTTPS origin을 허용 |
| `LAB678_ALLOWED_ORIGINS` | 같은 주소에서 화면/API를 제공할 때 비워둠. 별도 프론트나 커스텀 도메인은 실제 origin만 쉼표로 등록 |
| `PORT` | Render 기본값 사용. 수동 설정 불필요 |

`.env` 자동 로딩은 없다. 카카오 외 문화/보행 조회는 현재 공개 sample/공개 서비스 경로를 사용한다. 실제 배포 서버에서 쿼터·네트워크·정책·권한이 같은지는 별도 확인한다. 공개 API 호출 횟수와 키 사용량을 점검해야 한다.

HTTPS 프록시의 `X-Forwarded-*` 요청 헤더를 임의로 신뢰하지 않고, 서버 환경변수의 정확한 URL만 허용한다. CORS는 사용자 인증이나 API 키 사용량 제한을 대신하지 않는다. 현재 서버는 소규모 해커톤 점검용이며 장기 운영 서버로 검증한 상태는 아니다.

## 음성·시연 범위

- `선택한 행사 읽기`는 이용자의 브라우저 음성을 사용한다. 공개 HTTPS/Chrome에서 한국어 읽기와 중지를 실제 확인한다.
- `한 번 말하기`는 Chrome 마이크 권한과 음성 서비스 연결을 실제 확인한다. 서버 health나 자동 모의 검사로 성공 처리하지 않는다.
- Windows 전용 `음성 파일로 듣기`는 Linux 서버에서 숨긴다. 별도 서버 TTS를 새로 도입하지 않았다.
- 기록 재생은 10/31 전시·전체 자료다. 실시간 결과로 표시하거나 행사 유효일이 바뀐 뒤 최신 자료처럼 사용하지 않는다.
- Free 서비스는 15분 유휴 시 중지되고 첫 요청 재시작에 약 1분이 걸릴 수 있다. 시연 전 미리 접속한다. 임시 파일은 영구 저장소로 쓰지 않는다.

## 검증과 공개 후 확인

로컬에서 배포 설정(외부 바인딩·PORT·공개 HTTPS Origin·파일 음성 off)을 적용한 별도 프로세스를 띄웠다. `check_deployment.cjs`로 health, 기록 추천/선택, 허용/거절 origin, 파일 음성 숨김/503, 브라우저 읽기 버튼, 비공개 파일 404를 확인했다. `check_frontend_connection.cjs`의 별도 포트 CORS/오류 응답도 통과했다. 백엔드 32개 검사 PASS.

**아직 하지 않은 것:** Render 계정 연결·서비스 생성·키 등록·Linux 실행·공개 TLS·실시간 공급자 조회·실제 마이크/낭독. 로컬 모의 HTTPS Origin 헤더 검사는 실제 TLS 검사가 아니다.

공개한 뒤는 다음을 한 구간으로 점검한다: `/healthz` → 실시간 추천 → 카드 선택 → 도보/대중교통 텍스트·지도 → Chrome 음성/읽기 → 오류/빈 결과 후 복귀. 실제 URL과 배포 커밋을 공유 기록에 추가한다.

실패하면 마지막 검증 커밋으로 수동 재배포하고 로컬 시연을 유지한다. 키나 `.local` 파일을 저장소에 올리는 방법으로 해결하지 않는다.
