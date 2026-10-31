"""Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다."""
import os
import subprocess
from threading import BoundedSemaphore

_SLOT = BoundedSemaphore(2)
_RENDER = """
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$m = New-Object System.IO.MemoryStream
try {
    $v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'ko-KR' } | Select-Object -First 1
    $s.SelectVoice($v.VoiceInfo.Name)
    $s.SetOutputToWaveStream($m)
    [Console]::InputEncoding = [Text.Encoding]::UTF8
    $s.Speak([Console]::In.ReadToEnd())
    $s.SetOutputToNull()
    $m.Position = 0
    $m.CopyTo([Console]::OpenStandardOutput())
} finally { $s.Dispose(); $m.Dispose() }
"""


def render_wave(text):
    """문자열을 표준 입력으로 전달해 메모리에서 합성하고, 실패·과부하 때 예외를 반환한다."""
    if not isinstance(text, str) or not text.strip() or len(text) > 2500:
        raise ValueError("음성 파일로 읽을 문장을 확인해 주세요.")
    if os.name != "nt" or not _SLOT.acquire(blocking=False):
        raise RuntimeError("현재 PC 음성을 사용할 수 없습니다.")
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", _RENDER],
            input=text.encode("utf-8"), capture_output=True, timeout=25,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        if result.returncode or not result.stdout.startswith(b"RIFF") or len(result.stdout) <= 46:
            raise RuntimeError("한국어 음성 파일을 만들지 못했습니다.")
        return result.stdout
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError("PC 음성 합성 실패") from exc
    finally:
        _SLOT.release()
