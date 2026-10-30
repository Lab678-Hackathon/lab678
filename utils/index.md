# 코드 색인

자동 생성: `python utils/scripts/catalog.py --write`. 직접 편집하지 않는다.

요약으로 위치를 찾은 뒤 필요한 코드만 읽는다. 해시는 내용 변경 확인용이며 토큰 절약량 측정값이 아니다.

템플릿은 [templates/README.md](templates/README.md), 사용법은 [README.md](README.md)를 확인한다.

| 파일 | 개요 | SHA-256 앞 12자 |
|---|---|---|
| [backend/outing.py](../backend/outing.py) | 서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다. | `4945aa79d862` |
| [backend/preview.py](../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `68be2007e3ca` |
| [backend/test_outing.py](../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `0d881ceb311c` |
| [utils/scripts/catalog.py](../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `c6d6d58dfa8c` |
| [utils/scripts/commit_report.py](../utils/scripts/commit_report.py) | Commit an approved task with its complete UTF-8 report as the exact message. | `6db2e203612e` |
| [utils/scripts/context.py](../utils/scripts/context.py) | Render a compact restart brief from explicit state, without guessing decisions. | `7448d261b179` |
| [utils/scripts/harness.py](../utils/scripts/harness.py) | Run offline repository checks with explicit evidence and no auto-repair. | `3f5b351b0e75` |
| [utils/scripts/loop.py](../utils/scripts/loop.py) | Record a bounded hypothesis-change-evidence loop without executing repair code. | `0ce011ac4c31` |
| [utils/scripts/read_pdf.py](../utils/scripts/read_pdf.py) | Extract PDF pages locally and print a conservative redacted review copy. | `267f2bd17b9e` |
| [utils/scripts/reuse.py](../utils/scripts/reuse.py) | Verify copied files and snapshot selected Git files without checkout or merge. | `a04a2ce3e588` |
| [utils/scripts/verify_watch.py](../utils/scripts/verify_watch.py) | Smoke-test a running index watcher with a temporary documented source file. | `78a17133dfc1` |
| [utils/scripts/watch.py](../utils/scripts/watch.py) | Refresh indexes and the short context on file changes until explicitly stopped. | `93276854efe9` |
| [utils/tests/test_tools.py](../utils/tests/test_tools.py) | Exercise failure paths for indexes, copying, loops, context and commit guards. | `edcf28c5bab3` |
