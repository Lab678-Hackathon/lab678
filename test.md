# 작업 요약 (1 → 2 → 3 순서)

## 1️⃣ 커밋 & 푸시
- `backend/app/models/topic.py` 파일을 **add → commit → push** (풀 리퀘스트 생성은 이미 완료)
- 커밋 `Add Topic scaffold Pydantic models` 가 `full-framework` 브랜치에 푸시됨

## 2️⃣ 테스트 추가
- `tests/test_topic.py` 파일을 생성 (ResultStatus, Candidate, DiscoverRequest, DiscoverResponse 검증)
- `pytest -q` 실행 → **19개 테스트 모두 통과**

1. **가상환경 활성화**
   ```powershell
   # 프로젝트 루트에서 PowerShell을 열고
   .\.venv\Scripts\Activate.ps1   # PowerShell 용 활성화 스크립트
   ```
   > 위 명령을 실행하면 프롬프트 앞에 `( .venv )` 가 표시됩니다. 가상환경이 정상적으로 활성화된 상태입니다.

2. **FastAPI 서버 실행** (백그라운드 실행)
   ```powershell
   # 현재 가상환경이 활성화된 상태에서
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend &
   ```
   - `&` 를 마지막에 붙이면 서버가 백그라운드에서 실행되고, 현재 PowerShell 세션을 그대로 사용할 수 있습니다.
   - 실행 직후 화면에 다음과 비슷한 로그가 나타납니다:
     ```
     INFO:     Started server process [PID]
     INFO:     Application startup complete.
     INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
     ```
   - 서버가 정상 가동되었는지 확인하려면 다음 명령을 실행해 보세요(다음 단계 3 참고).

3. **서버 동작 확인** – `/health` 엔드포인트 호출
   ```powershell
   Invoke-WebRequest -Uri http://127.0.0.1:8000/health -UseBasicParsing | Select-Object -ExpandProperty Content
   ```
   - 정상적인 출력 예시:
     ```json
     {"ok":true,"env":"development","llm_provider":"openai","rag":false,"config":"missing: ['openai_api_key','supabase_url','supabase_publishable_key','supabase_secret_key']"}
     ```
   - 이 응답이 나오면 FastAPI 서버가 정상 작동하고 있음을 의미합니다.

4. **Topic API (POST) 호출** – PowerShell에서 `Invoke-WebRequest` 로 직접 검증
   ```powershell
   $headers = @{ "Content-Type" = "application/json" }
   $body = '{ "query": "test" }'
   Invoke-WebRequest -Uri http://127.0.0.1:8000/api/topic/discover `
       -Method POST -Headers $headers -Body $body -UseBasicParsing | Select-Object -ExpandProperty Content
   ```
   - 기대되는 JSON 응답 예시:
     ```json
     {"candidates":[{"id":"c1","name":"Sample","description":"Sample description","status":"confirmed","price":"free","location":"Seoul","reason":null,"unconfirmed":[]}],"total":1,"notices":[]}
     ```
   - 응답이 위와 같은 형태이면 `/api/topic/discover` 라우터가 정상 동작하고 있는 것입니다.

5. **브라우저에서 직접 확인**
   - 웹 브라우저(Chrome, Edge 등)를 열고 주소창에 `http://127.0.0.1:8000/health` 를 입력합니다. JSON 형식으로 health 상태가 표시됩니다.
   - **데모 HTML** 파일을 이용해 UI 로 확인하려면, 프로젝트 루트에서 다음 명령을 실행해 파일을 엽니다:
     ```powershell
     start .\frontend\topic_demo.html
     ```
     - 페이지가 열리면 **“Call Topic API”** 버튼을 클릭합니다.
     - 아래 **Result** 영역에 앞서 4 단계에서 확인한 JSON 데이터가 그대로 표시됩니다.

6. **서버 종료** (필요 시)
   - 현재 백그라운드에서 실행 중인 `uvicorn` 작업을 확인하려면:
     ```powershell
     manage_task --Action list
     ```
   - 출력에 `task-137` (예시) 와 같은 작업 ID가 보입니다.
   - 해당 작업을 중지하려면:
     ```powershell
     manage_task --Action kill --TaskId 0c659c88-3d4e-4049-a651-5152e1bb4696/task-137
     ```
   - 작업이 정상 종료되면 콘솔에 종료 로그가 표시됩니다.

**요약**: 위 순서대로 진행하면 가상환경에서 FastAPI 서버를 구동하고, PowerShell 과 브라우저 양쪽에서 Topic API 를 검증할 수 있습니다.

- 프로젝트 의존성 설치 (`pip install -r backend/requirements.txt` → httpx 버전 조정 후 성공)
- FastAPI 서버 실행 (`uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`)
- 서버가 정상 시작돼 `fastapi` 모듈 import 에러 없이 실행 가능

### 실행 방법 (추가)
1. **가상환경 활성화**
   ```powershell
   .\.venv\Scripts\Activate.ps1   # PowerShell
   # 혹은
   source .\.venv/bin/activate   # Bash/WSL
   ```
2. **FastAPI 서버 시작** (백그라운드 실행)
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend &
   ```
   - `&` 를 붙이면 현재 쉘을 그대로 유지하면서 백그라운드에서 서버가 실행됩니다.
3. **브라우저에서 확인**
   - `http://127.0.0.1:8000/health` → `{ "ok": true, ... }`
   - `http://127.0.0.1:8000/api/topic/discover` 는 POST 전용이므로 아래 예시처럼 요청합니다.
4. **POST 요청 테스트** (PowerShell)
   ```powershell
   $headers = @{ "Content-Type" = "application/json" }
   $body = '{ "query": "test" }'
   Invoke-WebRequest -Uri http://127.0.0.1:8000/api/topic/discover `
       -Method POST -Headers $headers -Body $body `
       -UseBasicParsing | Select-Object -ExpandProperty Content
   ```
   - 기대 결과: `{"candidates":[{"id":"c1","name":"Sample", ...}],"total":1,"notices":[]}`
5. **서버 종료**
   - 백그라운드 작업 목록 확인: `manage_task --Action list`
   - 해당 작업 ID 로 종료: `manage_task --Action kill --TaskId <task-id>`

- 프로젝트 의존성 설치 (`pip install -r backend/requirements.txt` → httpx 버전 조정 후 성공)
- FastAPI 서버 실행 (`uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`)
- 서버가 정상 시작돼 `fastapi` 모듈 import 에러 없이 실행 가능

---
### 확인 방법
1. **API 엔드포인트**: <http://127.0.0.1:8000/health> → `{"status":"ok"}`
2. **Topic 모델 샘플 요청** (라우터가 추가된 경우):
   ```bash
   curl -X POST http://127.0.0.1:8000/api/topic/discover \
        -H "Content-Type: application/json" \
        -d '{"query":"test"}'
   ```
3. **테스트 재실행**: `pytest -q` (0.12 s 안에 통과)

---
### 다음 단계 제안
- **라우터 구현**: `backend/app/api/topic.py`에 `discover` 라우터 추가
- **문서 업데이트**: `framework_doc` 또는 `README.md`에 Topic scaffold 사용법 기록
- **배포**: Dockerfile 혹은 CI 파이프라인 설정 지원
- **추가 테스트**: 복잡한 시나리오 테스트 추가 가능

필요한 작업을 알려 주시면 바로 진행합니다.