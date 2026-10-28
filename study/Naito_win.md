# Naito (Claude Code CLI) 설치 가이드 – Windows

이 문서는 **Windows** 환경에서 Naito (Claude Code CLI)를 설치하고 정상 동작을 확인하는 전체 과정을 정리합니다.  
전체 작업은 `install_naito.ps1` 스크립트를 이용했으며, 스크립트와 동일한 명령을 단계별로 직접 실행해도 됩니다.

---
## 📦 전제 조건
- **관리자 권한**이 있는 PowerShell 창에서 작업
- **Node.js** (버전 14 이상) 가 필요합니다. 아직 설치되지 않았다면 `winget` 으로 설치합니다.
- **npm** 경로 (`%APPDATA%\npm`) 가 `PATH`에 있어야 `claude` 명령을 사용할 수 있습니다.

---
## 1️⃣ Node.js 설치 확인
```powershell
# Node.js가 설치돼 있는지 확인
node -v
```
- 없을 경우 아래 명령으로 설치 (이미 설치된 경우 스킵됩니다.)
```powershell
winget install --id OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
```
- 설치 후 현재 세션에 PATH를 반영:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine')
```

---
## 2️⃣ PATH에 Node·npm 추가 (관리자 권한 필요)
```powershell
$nodeDir = "C:\Program Files\nodejs"
$npmBin  = "$env:APPDATA\npm"
$machinePath = [Environment]::GetEnvironmentVariable('Path',[EnvironmentVariableTarget]::Machine)
if (-not ($machinePath -like "*${nodeDir}*")) {
    Write-Host "Adding Node.js directory to system PATH..."
    [Environment]::SetEnvironmentVariable('Path', "$machinePath;$nodeDir;$npmBin", [EnvironmentVariableTarget]::Machine)
}
# 현재 세션에도 반영
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine')
```
> **Tip**: `where.exe node` 로 실제 실행 파일 위치를 확인할 수 있습니다.

---
## 3️⃣ Claude Code CLI 설치
```powershell
# post‑install 스크립트 허용 (일부 Windows 환경에서 필요)
npm config set allow-scripts=@anthropic-ai/claude-code --location=user

# 기존 전역 패키지 제거 (선택 사항)
npm uninstall -g @anthropic-ai/claude-code

# 새로 설치
npm install -g @anthropic-ai/claude-code
```
설치가 끝나면 `claude.cmd`, `claude.ps1` 파일이 `%APPDATA%\npm` 폴더에 생성됩니다.

---
## 4️⃣ 설정 파일(`settings.json`) 작성
```powershell
$settingsDir  = Join-Path $env:USERPROFILE ".claude"
if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Path $settingsDir -Force }
$settingsPath = Join-Path $settingsDir "settings.json"

$settings = @{
    env = @{
        ANTHROPIC_BASE_URL = "https://copa.codyssey.kr"
        ANTHROPIC_API_KEY  = "<YOUR_CODYSSEY_API_KEY>"   # ← 여기엔 코디세이 API 키를 입력
        ANTHROPIC_MODEL    = "claude-sonnet-4"
        ANTHROPIC_SMALL_FAST_MODEL = "claude-haiku-4"
    }
} | ConvertTo-Json -Depth 5

Set-Content -Path $settingsPath -Value $settings -Encoding UTF8 -Force
Write-Host "Created settings file at $settingsPath"
```
> **주의**: `ANTHROPIC_API_KEY`에 실제 발급받은 **코디세이 API 키**를 넣어야 합니다.

---
## 5️⃣ 설치 검증
```powershell
# 현재 세션 PATH를 최신화 (필요 시)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine')

if (Get-Command claude -ErrorAction SilentlyContinue) {
    claude --version   # 예: 2.1.312 (Claude Code)
    Write-Host "Installation succeeded. Ready to use 'claude' command."
} else {
    Write-Error "Claude command not found. Restart the terminal after PATH update."
}
```
정상 출력이 나오면 설치 완료!

---
## 📄 자동화 스크립트
위 모든 과정을 자동화한 PowerShell 스크립트가 **`install_naito.ps1`** 로 프로젝트 루트에 저장돼 있습니다.
```powershell
C:\Users\DJ\.gemini\antigravity-cli\brain\198d8778-0b86-4db5-bb5d-79248569f515\install_naito.ps1
```
PowerShell 관리자로 실행하면 위 단계가 순차적으로 수행됩니다.

---
## 🎉 사용 예시
```powershell
# 간단히 대화 시작
claude chat

# 특정 파일에 대해 코드 제안 요청
claude edit path/to/file.py "리팩터링 제안"
```

---
**마무리**
- `settings.json`에 올바른 API 키가 들어갔는지 확인
- `claude` 명령을 새 터미널에서 바로 사용할 수 있어야 함
- 문제가 생기면 `where.exe claude*` 로 실제 파일 위치를 확인하고 PATH를 다시 검토하세요.

> 이 문서는 `C:\Users\DJ\git\codyssey-konnect\study\Naito_win.md` 에 저장되었습니다.

---

## 📝 검토 의견

이번 Windows 환경에서는 이 절차로 실제 설치가 성공했으므로, **현재 PC에서의 해결 방법으로는 유효하다**고 판단합니다. 특히 Node.js/npm이 이미 사용 가능한 환경이라면 `npm install -g @anthropic-ai/claude-code`와 `%APPDATA%\npm` PATH 등록만으로 `claude` 명령을 복구할 수 있습니다.

다만 다른 Windows PC에 그대로 배포할 설치 가이드로 사용할 때는 다음을 보완해야 합니다.

1. **npm 방식과 네이티브 방식의 구분**
   - 이 문서는 npm 방식으로 성공한 실제 절차를 기록한 문서입니다.
   - 최신 Claude Code의 Windows 네이티브 설치 방식과는 다르므로, “유일한 공식 설치 방법”으로 표현하지 않는 것이 정확합니다.
   - Node.js가 없는 PC에서는 npm 방식보다 네이티브 설치를 먼저 검토할 수 있습니다.

2. **관리자 권한과 시스템 PATH 변경은 최소화**
   - 설치 성공에는 도움이 될 수 있지만, 시스템 PATH를 직접 수정하면 다른 사용자와 프로그램에 영향을 줍니다.
   - 가능하면 사용자 PATH(`%APPDATA%\npm`)만 등록하고, 일반 사용자 PowerShell에서 설치하는 방식을 우선해야 합니다.
   - `npm` 또는 `claude`가 이미 인식되면 PATH를 다시 쓰지 않아야 합니다.

3. **기존 `settings.json` 덮어쓰기 방지**
   - `Set-Content -Force`는 기존 Claude 설정을 통째로 덮어씁니다.
   - 기존 권한, 플러그인, 기타 환경 설정이 있는 사용자는 백업 후 필요한 `env` 값만 병합해야 합니다.
   - API 키는 문서·스크립트·Git에 직접 저장하지 않고 사용자가 실행 시 입력하거나 환경변수/보안 저장소로 주입해야 합니다.

4. **임시 작업 경로는 재현 가능한 설치 파일이 아님**
   - `C:\Users\DJ\.gemini\antigravity-cli\brain\...\install_naito.ps1`는 현재 PC의 임시 경로입니다.
   - 다른 PC에서 실행할 수 있도록 하려면 스크립트를 저장소의 `study\install_naito.ps1` 같은 고정 위치에 별도로 저장해야 합니다.
   - 단, API 키가 포함된 스크립트는 저장소에 추가하면 안 됩니다.

5. **최종 검증은 버전 확인만으로 충분하지 않음**
   - `claude --version`은 CLI 설치와 PATH만 확인합니다.
   - 실제 사용 가능 여부는 새 PowerShell에서 `claude`를 실행하고, Copa endpoint와 설정된 모델로 간단한 요청까지 성공하는지 별도로 확인해야 합니다.
   - `401 Unauthorized`가 나오면 설치 문제가 아니라 API 키, 권한, endpoint 또는 모델 설정 문제입니다.

### 최종 판단

**현재 사용자 PC의 Naito 설치는 성공했고, 이 문서는 실제 복구 과정을 남긴 기록으로 가치가 있습니다.** 다만 팀 공유용 가이드로 확정하려면 시스템 PATH 직접 수정과 설정 파일 강제 덮어쓰기를 완화하고, 임시 경로의 설치 스크립트를 저장소 내 재현 가능한 파일로 정리하는 것이 좋습니다.
