# 코드 색인

자동 생성: `python utils/scripts/catalog.py --write`. 직접 편집하지 않는다.

요약으로 위치를 찾은 뒤 필요한 코드만 읽는다. 해시는 내용 변경 확인용이며 토큰 절약량 측정값이 아니다.

템플릿은 [templates/README.md](templates/README.md), 사용법은 [README.md](README.md)를 확인한다.

| 파일 | 개요 | SHA-256 앞 12자 |
|---|---|---|
| [backend/course.py](../backend/course.py) | 서울시 후보 최대 다섯 곳의 방문 순서를 비교해 두 곳 도보 일정 하나를 제시한다. | `c3086ab83390` |
| [backend/local_voice.py](../backend/local_voice.py) | Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다. | `9b8aca108c6c` |
| [backend/outing.py](../backend/outing.py) | 서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다. | `5004101951ed` |
| [backend/preview.py](../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `a6b01e2cafaa` |
| [backend/test_course.py](../backend/test_course.py) | 두 곳 도보 일정의 마감 경계·휴관 원문·결측·방문 순서를 검사한다. | `22e2f54c0643` |
| [backend/test_outing.py](../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `2ad5c0f55de8` |
| [backend/walking.py](../backend/walking.py) | 개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다. | `44e4712c01be` |
| [utils/scripts/catalog.py](../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `ecb99cd9ca5b` |
| [utils/scripts/commit_report.py](../utils/scripts/commit_report.py) | Commit an approved task with its complete UTF-8 report as the exact message. | `71ec658dfada` |
| [utils/scripts/context.py](../utils/scripts/context.py) | Render a compact restart brief from explicit state, without guessing decisions. | `fd76e9b14c3b` |
| [utils/scripts/harness.py](../utils/scripts/harness.py) | Run offline repository checks with explicit evidence and no auto-repair. | `16a9248426c4` |
| [utils/scripts/loop.py](../utils/scripts/loop.py) | Record a bounded hypothesis-change-evidence loop without executing repair code. | `2b91226d1d91` |
| [utils/scripts/read_pdf.py](../utils/scripts/read_pdf.py) | Extract PDF pages locally and print a conservative redacted review copy. | `27fb9fcaa1e9` |
| [utils/scripts/reuse.py](../utils/scripts/reuse.py) | Verify copied files and snapshot selected Git files without checkout or merge. | `b0da97aea104` |
| [utils/scripts/verify_watch.py](../utils/scripts/verify_watch.py) | Smoke-test a running index watcher with a temporary documented source file. | `3a98cf1bc20b` |
| [utils/scripts/watch.py](../utils/scripts/watch.py) | Refresh indexes and the short context on file changes until explicitly stopped. | `259f3fc032e0` |
| [utils/tests/test_tools.py](../utils/tests/test_tools.py) | Exercise failure paths for indexes, copying, loops, context and commit guards. | `40a7618753a1` |
