# 실행 가이드 (test.md)

## 📌 목표 (What)
- **FastAPI** 백엔드 서버와 **정적 웹 서버**(topic_demo.html)를 차례대로 실행하여, 브라우저에서 `http://127.0.0.1:5500/topic_demo.html` 를 열고 **Topic API**(POST `/api/topic/discover`)가 정상 동작하는지 확인한다.

---
## 1️⃣ FastAPI 실행
PowerShell에서 아래 명령을 실행합니다.
```powershell
cd C:\Users\DJ\git\codyssey-konnect
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
정상 실행되면 다음 로그가 표시됩니다.
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```
> **주의**: 이 PowerShell 창을 닫지 말고 그대로 두세요.

---
## 2️⃣ FastAPI 실행 확인
### 웹 브라우저
- `http://127.0.0.1:8000/docs` → Swagger UI 가 열리면 정상.
- `http://127.0.0.1:8000/health` → 아래와 같은 JSON 응답이 나오면 정상.
```json
{
  "ok": true,
  "env": "development",
  "llm_provider": "openai",
  "rag": false,
  "config": "missing: [...]"
}
```
> `"ok": true` 가 핵심이며, `config` 의 `missing` 은 API 키가 없다는 경고입니다.

### PowerShell 확인
```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```
`StatusCode : 200` 가 나오면 정상.

### Topic API 테스트
```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/topic/discover -ContentType "application/json" -Body '{"query":"test"}'
```
`candidates`, `total`, `notices` 필드가 포함된 JSON 이 반환되면 성공.

---
## 3️⃣ FastAPI 종료
FastAPI를 실행한 **같은 PowerShell 창**으로 이동하여
```
Ctrl + C
```
를 누릅니다. 프롬프트가 다시 나타나면 종료된 것입니다.
```
PS C:\Users\DJ\git\codyssey-konnect>
```

---
## 4️⃣ FastAPI 종료 확인
### PowerShell
```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```
출력이 없으면 FastAPI 가 종료된 상태.

### 간단 스크립트
```powershell
try {
    Invoke-WebRequest http://127.0.0.1:8000/health -TimeoutSec 3
} catch {
    Write-Output "FastAPI is stopped"
}
```
`FastAPI is stopped` 가 출력되면 정상 종료.

---
## 📄 정적 웹 서버 (별도)
FastAPI 와는 별개이며, 아래 명령으로 실행합니다.
```powershell
cd frontend
python -m http.server 5500
```
브라우저에서 `http://127.0.0.1:5500/topic_demo.html` 로 접근합니다.

---
> **요약**
- **실행**: `cd C:\... && .\backend\.venv\Scripts\python.exe -m uvicorn …`
- **확인**: `http://127.0.0.1:8000/docs` 혹은 `Invoke-WebRequest …/health`
- **종료**: `Ctrl + C` in the same window
- **종료 확인**: `Get-NetTCPConnection -LocalPort 8000` or the PowerShell try/catch script.
