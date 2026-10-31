# 팀 프론트 채팅·자동 추천 적용 패키지

2026-10-31. 사용자 “다음 진행하자”에 따라 최신 원격 확인 후 팀원에게 인계할 **실파일 적용 패치**를 만들고 실행했다. `develop=06c0443`, `feature/front=164cd40`으로 앞선 검증 이후 원격 변경 없음. 백엔드 기준0b7494a. 팀 브랜치 원본과 공용 plan은 변경하지 않았다.

## 결과

- 변경은 `frontend/index.html`, `frontend/js/search.js`, `frontend/js/dj-chat.js`, `frontend/js/dj-preferences.js` 네 파일뿐이다.
- 두 기존 파일은 연결 지점만 수정하고 두 모듈을 추가한다. 팀의 나머지 화면·디자인을 덮어쓰지 않는다.
- `git apply --check` 후 **별도 복사본에 실제 패치 적용**, 네 파일 결과 SHA256 일치 검사 완료.
- 일반 팀 `frontend/dev_server.py`를5175로 실행했다. 기존5174의 응답 가공 방식 없이, 실제 수정 파일로 동작한다.
- 실제 Naito3회 대화→조건설정→recorded4후보→상세ID, 실제 서울시 미래날짜 음악3분류2후보 PASS.
- 추가 UI회복4구간 PASS: fixture 조건의0건→실제Naito1회 해제/확정값동의→recorded5후보→새로고침/상세. 모의502에서 입력·이전 결과 보존.
- 이번 검증의 실제AI는 총4회. 실제 마이크·모바일 기기·지도 타일·공개 배포는 PASS 범위 밖이다.

근거: [대상/파일 해시](qa-handoff/manifest.json), [대화·추천 결과](qa-handoff/natural-flow.json), [회복 결과](qa-handoff/recovery.json).

## 재생성과 실행

최신 백엔드 코드와 로컬 원격 참조를 준비한 저장소에서:

```sh
python utils/scripts/prepare_chat_handoff.py --ref origin/feature/front
```

출력된 `.local/chat-handoff-<프론트해시>-<패치해시>/`에 다음 파일을 만든다. 동일 산출물 경로가 이미 있으면 덮어쓰지 않고 기존 경로를 안내한다.

- `team-chat-handoff.zip`: README, manifest.json, team-chat.patch만 포함한다. 실제 키/환경 파일·백엔드·전체 프론트 사본은 포함하지 않는다.
- `project/frontend/`: 패치를 적용하고 검증한 실행용 로컬 복사본.
- `manifest.json`: 프론트·백엔드 기준 버전과 네 파일/패치 해시.

현재 생성 경로: `.local/chat-handoff-164cd40-ab4591e631/`.

```powershell
$env:PORT='5175'
python .local/chat-handoff-164cd40-ab4591e631/project/frontend/dev_server.py
```

백엔드8765가 먼저 실행되어 있어야 한다. [실파일 통합 화면](http://127.0.0.1:5175/?mode=recorded&debug=1#/search)은 실제 AI + 기록 행사다. 공개 URL이 아니다.

기존 검사 스크립트에 `LAB678_TEST_BASE=http://127.0.0.1:5175`를 주면 동일 검사를 해당 실행본에 재사용한다. 기본값은5174이며 자동으로 실제 API를 반복 호출하지 않는다.

## 담당 확인 후 반영

TEAM_WORKFLOW.md의 “공통·타 담당 영역은 변경 전에 관련 팀원에게 공유·확인” 기준 때문에 이 작업은 인계 패키지까지 준비했다. 팀 원본 반영 완료로 보고하지 않는다.

희영님은 최신 개인 프론트 브랜치의 깨끗한 작업 폴더에서 패치를 검토한 뒤 아래 순서로 적용한다. 실패하면 강제 적용하지 않고 최신 화면과 연결 지점을 다시 맞춘다.

```sh
git apply --check /패키지경로/team-chat.patch
git apply /패키지경로/team-chat.patch
```

확인할 연결은 S02a 요청 생성 시 `withPreferences(request)`, 확인 화면 `renderPreferenceSummary(r)`, HTML에서 채팅 모듈 로딩이다. 패키지의 코드 자체가 확정 디자인을 뜻하지 않는다. API 키는 백엔드에만 두고, 배포 때 실제 프론트 origin/API 주소/CORS를 따로 검증한다.

## 팀 공유용 문구 · 전송하지 않은 초안

희영님, 현재 원격 프론트164cd40 기준으로 AI 대화·자동 조건 설정·추천 연결 패키지를 준비했습니다. 변경은 index.html/search.js 연결 두 곳과 채팅·선호 모듈2개입니다. 팀 원본은 아직 수정하지 않았습니다.

패치를 실제 파일에 적용한 별도 복사본에서 일반 개발 서버로 실행했고, 실제AI→조건확인→기록추천→상세와 실시간 음악조회, 0건/조건해제/재추천/오류보존까지 통과했습니다. 적용 범위와 UI 배치를 확인해 주시면 최신 프론트에 맞춰 통합하겠습니다. 기록 재생/실시간은 구분하며, 실제 마이크와 공개 배포는 후속 확인입니다.

저장소 안내는 docs/development/frontend-chat-package.md, 생성 명령은 python utils/scripts/prepare_chat_handoff.py --ref origin/feature/front 입니다. 백엔드 최신 개발분과 이 도구는 동조 로컬에 있으며 Push 공유는 아직 하지 않았습니다.

## 최신 패키지 · 문화시설 선택 포함

기존 네파일 패키지 이후 추가된 최신 버전은 **6파일**이다. results.js 출처표시와 dj-culture.js 입력선택을 추가했다. 현재 실행본은 `.local/chat-handoff-164cd40-78acae4abc/`이고5175로 제공한다. 문화시설은 live만 지원하므로 http://127.0.0.1:5175/?debug=1#/search 로 확인한다. 이전 recorded 링크는 서울시 기록 검증에만 사용한다. [키별 반영·최신 검증·인계](service-key-status.md). 기존 본문의 네파일/ab4591e631은 이전 작업 이력이다.

## 최신 패키지 · 자동 음성 대화 포함

현재 최신은 **7파일**이며 `.local/chat-handoff-164cd40-1588144da0/`다. dj-voice.js 추가, 채팅 시작/중지·최대횟수/무응답 설정 포함. 기존6파일은 문화정보 연결 시점 이력. 실파일5175와 동적5174를 갱신했다. [자동 음성 계약과 검증](automatic-voice.md).

## 최신 자동 대화·화면 조작 패키지 (2026-10-31)

`.local/chat-handoff-164cd40-01e552cba6/team-chat-handoff.zip` · 8파일 · frontend164cd40 대상. AI 첫 질문→자동 듣기 반복, 공통 패널·화면 이동 모듈 추가. 자세한 현재 사용법은 [자동 음성 대화](automatic-voice.md). 앞선 패키지 설명은 이력이며 현재 패키지가 우선한다. 팀 원본 반영은 담당 확인 후다.

## 최신 · 마이크 켜기/끄기 표시

현재는 `.local/chat-handoff-6accf0e-063bdde13b/team-chat-handoff.zip` (8파일, 프론트6accf0e)이다. 마이크 아이콘/켜짐·꺼짐 상태와 누른 상태, 같은 버튼으로 중지·재시작을 보강했다. 프론트의 배포주소 추가를 확인하고 로컬 대화는 같은 주소의 프록시를 쓰도록 맞췄다. 5175 실행본을 갱신했으며 팀 원본/배포에 반영했다는 뜻은 아니다.

## 최신 · 듣는 중 파동 표시

`.local/chat-handoff-6accf0e-026a06b9ea/team-chat-handoff.zip` (8파일). 오디오 시작/끝으로 실제 듣기 상태를 표시하고 마이크에 파동을 추가했다. 연결 대기·TTS·처리·중지에서는 멈추고 움직임 줄이기 설정을 반영한다. 접두어 음성 API/미지원 텍스트 복귀 검사 포함. [실기기 미검증 범위](voice-browser-compatibility.md)를 함께 전달한다.
