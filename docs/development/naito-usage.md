# Naito 사용 안내 · 사용자 제공 자료 보관

출처: 김동조님이 2026-10-31 대화에 전달한 코디세이 Naito 안내. 아래 가용성/배수는 전달 시점 자료이며 독립 조회한 현재 상태가 아니다. API 키는 포함하지 않는다.

**앱 채팅 모델은 사용자 지정 `claude-sonnet-4`**. Naito 화면 표기는 Claude Sonnet 4.6이며 API에는 모델 ID를 그대로 보낸다. 다른 모델로 자동 변경하지 않는다.

## 주소·인증

- Public API Base URL: `https://copa.codyssey.kr`
- OpenAI 호환 Base URL: `https://copa.codyssey.kr/v1`
- **현재 앱 채팅:** `POST https://copa.codyssey.kr/v1/messages` (Anthropic 호환)
- 현재 헤더: `x-api-key: <virtual-key>`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
- OpenAI 호환 키를 별도로 사용할 때의 참고 주소: `/v1/chat/completions`, `Authorization: Bearer <virtual-key>`

```json
{"model":"claude-sonnet-4","max_tokens":1024,"messages":[{"role":"user","content":"안녕하세요"}]}
```

사용자 원문 OpenAI 호환 예제는 `gpt-5-mini`와 messages를 사용했다. 실제 제공 키로 OpenAI 호환 경로를 호출하니 HTTP403 permission_denied(해당 프로토콜 권한 없음)가 반환됐다. 따라서 **키를 바꾸지 않고 Anthropic 호환 경로로 수정했으며 실제 호출에 성공했다.** 현재 앱은 두 프로토콜을 자동 전환하지 않는다.

Anthropic 요청의 system/messages/max_tokens 및 응답 content 구조는 [공식 Messages 문서](https://platform.claude.com/docs/en/api/messages/create)를 참고하고 Naito 실제 응답으로 확인했다. API 키 발급 시 선택한 프로토콜을 구분해야 한다.

## 앱 설정

로컬 파일 **`D:\git\lab678\.local\naito.env`**를 생성했다. `.local`은 Git 제외 대상이다.

```dotenv
LAB678_NAITO_API_KEY=
LAB678_NAITO_MODEL=claude-sonnet-4
```

발급한 키를 첫 줄 값에만 넣는다. 따옴표 없이 저장한다. 실행 환경변수가 있으면 파일보다 우선하며, 배포할 때는 같은 이름으로 서버 환경변수에 등록한다. 키를 프론트/저장소/채팅에 복사하지 않는다. 전역 Claude Code 설정을 앱에서 가져오거나 변경하지 않는다.

구현 파일은 `backend/naito_chat.py`. 표준 Python으로 고정 주소를 한 번 호출하며 자동 재시도·다른 모델 대체는 없다. 출력 토큰 한도1024, 응답 상한64KiB, 네트워크 timeout20초, 동시 호출 최대2개다. 토큰 한도로 잘린 응답은 적용하지 않는다. 키/원문을 로그에 남기지 않는다. 입력 문장·최근 대화·조건 요약은 해석을 위해 Naito로 보내며 출발지 좌표는 제외한다.

## Endpoint reference 원문 정보

| 프로토콜 | Endpoint | 응답/용도 |
|---|---|---|
| Anthropic | `/v1/messages` | Protocol native |
| Anthropic | `/v1/messages/count_tokens` | Protocol native |
| Anthropic | `/v1/models` | Protocol native |
| OpenAI | `/v1/models` | Protocol native |
| OpenAI | `/v1/chat/completions` | Protocol native |
| Media | `/api/v1/images` | 이미지 생성 요청 |
| Media | `/api/v1/audio/tts` | 텍스트를 음성으로 변환하는 TTS 생성 요청 |
| Media | `/api/v1/videos` | 영상 생성 작업 요청, 작업 ID 반환 |
| Media | `/api/v1/videos/{id}` | 영상 작업 진행 상황과 결과 확인 |
| Media | `/api/v1/videos/{id}/download` | 완료된 영상 mp4를 API 키로 다운로드 |

## 모델별 차감 가중치 원문 정보

사용자 제공 표의 모든 항목은 상태 `사용 가능`, 버전 `1`이다. 배수는 Naito 차감 기준이며 달러 가격이 아니다.

| 모델 ID | 이름 | Provider | Modality | 차감 배수 |
|---|---|---|---|---|
| gemini-3-flash | Gemini 3 Flash | GOOGLE | CHAT | 0.5 |
| gemini-3.1-flash-lite | Gemini 3.1 Flash Lite | GOOGLE | CHAT | 0.5 |
| gemini-3.1-pro | Gemini 3.1 Pro | GOOGLE | CHAT | 1.5 |
| claude-haiku-4 | Claude Haiku 4.5 | ANTHROPIC | CHAT | 0.5 |
| claude-sonnet-4 | Claude Sonnet 4.6 | ANTHROPIC | CHAT | 1 |
| gpt-5-mini | GPT-5 Mini | OPENAI | CHAT | 0.5 |
| gpt-image-2 | GPT Image 2 (최신/권장) | OPENAI | IMAGE | 1 |
| gpt-image-1.5 | GPT Image 1.5 | OPENAI | IMAGE | 1 |
| gpt-image-1-mini | GPT Image 1 Mini (저렴) | OPENAI | IMAGE | 1 |
| imagen-4 | Imagen 4 (Standard, 권장) | GOOGLE | IMAGE | 1 |
| imagen-4-fast | Imagen 4 Fast (저렴) | GOOGLE | IMAGE | 1 |
| imagen-4-ultra | Imagen 4 Ultra (고품질) | GOOGLE | IMAGE | 1 |
| gemini-2.5-flash-image | Gemini 2.5 Flash Image (Nano Banana) | GOOGLE | IMAGE | 1 |
| tts-1 | OpenAI TTS-1 | OPENAI | AUDIO | 1 |
| gpt-4o-mini-tts | GPT-4o Mini TTS | OPENAI | AUDIO | 1 |
| tts-1-hd | OpenAI TTS-1 HD (고품질) | OPENAI | AUDIO | 1 |
| gemini-2.5-flash-tts | Gemini 2.5 Flash TTS (저렴) | GOOGLE | AUDIO | 1 |
| sora-2 | OpenAI Sora 2 | OPENAI | VIDEO | 1 |
| veo-3.1 | Google Veo 3.1 | GOOGLE | VIDEO | 1 |
| veo-3.1-fast | Google Veo 3.1 Fast | GOOGLE | VIDEO | 1 |
| claude-opus-4-7 | Claude Opus 4.7 | ANTHROPIC | CHAT | 1.5 |
| claude-opus-4-8 | Claude Opus 4.8 | ANTHROPIC | CHAT | 1.5 |
| gpt-5.5 | GPT-5.5 | OPENAI | CHAT | 2 |
| gpt-5.4 | GPT-5.4 | OPENAI | CHAT | 1 |
| gpt-5.4-mini | GPT-5.4 mini | OPENAI | CHAT | 0.5 |

## 개발 도구 연결 참고 · 앱 설정과 별개

사용자 자료에 따르면 Cursor·Continue는 위 OpenAI 호환 주소와 키를 사용할 수 있다. 세부 설정값은 제공되지 않았다.

Claude Code는 Windows `%USERPROFILE%\.claude\settings.json`, macOS/Linux/WSL `~/.claude/settings.json`의 env를 사용한다. 아래는 참고 원문이며 이번 작업에서 실제 전역 파일을 만들거나 변경하지 않았다.

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://copa.codyssey.kr",
    "ANTHROPIC_API_KEY": "<virtual-key>",
    "ANTHROPIC_MODEL": "claude-sonnet-4",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4"
  }
}
```

키는 발급받은 Anthropic 호환 키로 대체하고 새 터미널에서 실행하거나 `claude --settings ~/.claude/settings.json`으로 지정한다는 안내다. Naito의 모델/프로토콜별 실제 권한은 실호출로 확인해야 한다.

## 현재 확인 범위

공급자와 모델 목록은 사용자 제공 자료로 확인했다. 키 미설정/모의 성공·오류 검증 후, 사용자 저장 키로 **claude-sonnet-4 실제 호출 3개와 실행 서버 HTTP 연결 1개가 통과**했다. 국악 분류, 명시한 날짜·시간·출발지, 확정 시각 변경 동의를 검증했다. [고정 예문 실제 결과](examples/naito-chat.live.json)에 키 없는 결과를 보관했다.

재검사: `python utils/scripts/check_chat_live.py`는 실제 호출 3회로 사용량이 발생하므로 필요한 때만 실행한다. 전체 자유 대화 품질·STT 자동전송·팀 UI 연결·실제 차감량은 미검증이다. 이미지/영상/Media TTS는 이번 앱에 연결하지 않았다.
