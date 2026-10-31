"""팀 프론트에 적용할 최소 패치와 실행 복사본을 .local에 만든다. 작업 브랜치/팀 원본을 변경하지 않는다.

Usage: python utils/scripts/prepare_chat_handoff.py --ref origin/feature/front
변경 7파일만 포함한 ZIP, 버전/해시 manifest, 적용검사 결과를 생성한다. 키/환경 파일은 넣지 않는다.
"""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

from reuse import ROOT, snapshot


def integrate_index(source):
    """원본 HTML에 모듈을 한 번만 연결한다. 이미 연결되거나 구조가 다르면 거절한다."""
    if source.count("</body>") != 1 or "dj-chat.js" in source:
        raise ValueError("HTML integration point changed; frontend review required")
    return source.replace("</body>", '<script type="module" src="/js/dj-chat.js"></script>\n</body>')


def integrate_search(source):
    """확정 요청과 S02a 요약의 두 지점만 확장한다. 다른 팀 변경을 추측해 덮어쓰지 않는다."""
    if "dj-preferences.js" in source:
        raise ValueError("Preferences already integrated; frontend review required")
    hooks = {"state.confirmed = request;": "state.confirmed = withPreferences(request);",
             "$('#confirm-mode').hidden = testMode() !== 'recorded';":
             "$('#confirm-mode').hidden = testMode() !== 'recorded'; renderPreferenceSummary(r);"}
    for before, after in hooks.items():
        if source.count(before) != 1:
            raise ValueError("Search integration point changed; frontend review required")
        source = source.replace(before, after)
    return "import { withPreferences, renderPreferenceSummary } from './dj-preferences.js';\n" + source


def integrate_results(source):
    """추천·상세의 출처 표시만 확장하며 같은 후보 ID/지도/카드 흐름을 유지한다."""
    hooks = {
        "서울시 문화행사 정보 · ${checkedAt(res.source_checked_at)}": "${cultureLabel(res.source)} · ${checkedAt(res.source_checked_at)}",
        "서울시 문화행사 정보 · ${checkedAt(c.source_checked_at)}": "${cultureLabel(c.source)} · ${checkedAt(c.source_checked_at)}",
        "  row('운영시간', c.opening_info);": "  row('운영시간', c.opening_info);\n  if (c.candidate_kind === 'cultural_facility') row('휴관일', c.closed_info);",
        "  art.append(head, el('p', 'muted', c.venue || '장소 이름 확인 필요'));": "  art.append(head, el('p', 'muted', c.venue || '장소 이름 확인 필요'), el('p', 'caption', cultureLabel(c.source)));",
    }
    for before, after in hooks.items():
        if source.count(before) != 1:
            raise ValueError("Results integration point changed; frontend review required")
        source = source.replace(before, after)
    return "import { cultureLabel } from './dj-culture.js';\n" + source


def prepare(ref):
    """공개 Git 프론트 복사본에 패치를 실제 적용하고 결과 해시를 검증한 뒤 인계 ZIP을 만든다."""
    sha = subprocess.check_output(["git", "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"], cwd=ROOT).decode().strip()
    originals = {name: subprocess.check_output(["git", "show", f"{sha}:frontend/{name}"], cwd=ROOT).decode("utf-8")
                 for name in ("index.html", "js/search.js", "js/results.js")}
    changed = {"index.html": integrate_index(originals["index.html"]),
               "js/search.js": integrate_search(originals["js/search.js"]),
               "js/results.js": integrate_results(originals["js/results.js"]),
               "js/dj-culture.js": (ROOT / "backend/team_culture.js").read_text(encoding="utf-8"),
               "js/dj-voice.js": (ROOT / "backend/voice_session.js").read_text(encoding="utf-8"),
               "js/dj-chat.js": (ROOT / "backend/team_chat.js").read_text(encoding="utf-8"),
               "js/dj-preferences.js": (ROOT / "backend/team_preferences.js").read_text(encoding="utf-8")}
    diff = "".join("".join(difflib.unified_diff(originals.get(name, "").splitlines(keepends=True), text.splitlines(keepends=True),
                                              fromfile="a/frontend/" + name if name in originals else "/dev/null",
                                              tofile="b/frontend/" + name)) for name, text in changed.items())
    digest = hashlib.sha256(diff.encode()).hexdigest()
    target = ROOT / ".local" / ("chat-handoff-" + sha[:7] + "-" + digest[:10])
    if target.exists():
        raise ValueError(f"Package already exists; inspect or use its existing files: {target}")
    target.mkdir(parents=True)
    project = target / "project"
    snapshot(ROOT, sha, project, ["frontend"])
    patch = target / "team-chat.patch"
    patch.write_text(diff, encoding="utf-8", newline="\n")
    directory = project.relative_to(ROOT).as_posix()
    for flag in ("--check", None):
        command = ["git", "apply", "--whitespace=error", "--directory=" + directory]
        if flag:
            command.append(flag)
        subprocess.run([*command, str(patch)], cwd=ROOT, check=True)
    for name, text in changed.items():
        if (project / "frontend" / name).read_text(encoding="utf-8") != text:
            raise ValueError("Patch result differs: " + name)
    manifest = dict(frontend_ref=sha, backend_ref=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip(),
                    patch_sha256=digest, patch_applied_and_verified=True,
                    files={"frontend/" + name: hashlib.sha256(text.encode()).hexdigest() for name, text in changed.items()})
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme = f"""# 오늘 나들이 대화 추천 연결 패치

대상 프론트: {sha}
백엔드: {manifest['backend_ref']} 및 후속 호환 버전. 백엔드는 이 ZIP에 포함하지 않습니다.

희영님 확인 후 최신 개인 프론트 브랜치의 깨끗한 작업 폴더에서 검토해 주세요.
기존 팀 변경을 보존하려고 일곱 파일만 패치합니다. 다른 버전에서 실패하면 강제 적용하지 말고 차이를 확인해 주세요.

```sh
git apply --check /패키지경로/team-chat.patch
git apply /패키지경로/team-chat.patch
```

백엔드 `python backend/preview.py`, 프론트 `python frontend/dev_server.py`로 실행합니다.
기본 프론트 http://127.0.0.1:5173/?mode=recorded&debug=1#/search 는 실제 AI + 기록 행사입니다.
프론트 PORT 환경변수로 포트를 변경할 수 있습니다. API 키는 백엔드에만 설정합니다.
프로덕션은 별도 API 주소/CORS/키 설정 검증이 필요합니다. 이 패키지로 배포 완료를 뜻하지 않습니다.

새 파일: frontend/js/dj-chat.js, frontend/js/dj-preferences.js, frontend/js/dj-culture.js, frontend/js/dj-voice.js
연결 수정: frontend/index.html, frontend/js/search.js, frontend/js/results.js
코스 UI는 연결 중이며 현재 대화 화면은 place 흐름을 검증했습니다.
원본 소스/최신 계약: docs/development/natural-language-handoff.md
"""
    (target / "README.md").write_text(readme, encoding="utf-8")
    archive = target / "team-chat-handoff.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for name in ("README.md", "manifest.json", "team-chat.patch"):
            bundle.write(target / name, arcname=name)
    print(json.dumps(dict(package=str(target), zip=str(archive), frontend=str(project / "frontend"), **manifest), ensure_ascii=False, indent=2))
    return target


def main():
    """명시한 로컬 Git ref로 인계 산출물을 생성한다. 네트워크/push/checkout/merge는 하지 않는다."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="origin/feature/front")
    args = parser.parse_args()
    prepare(args.ref)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
