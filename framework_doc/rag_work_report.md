# 범용 RAG 구현 작업 기록

작성일: 2026-10-30 · 작업 브랜치: `framework`

## 목적과 범위

해커톤 주제가 아직 정해지지 않은 상태에서 재사용할 수 있는 범용 RAG를 준비했다.
KONNECT의 관광 지식과 서울 여행 전용 프롬프트는 가져오지 않았다.
`konnect` 브랜치의 `study/` 문서와 원본 RAG 구현을 참고했으며, 구현은 `framework`에 있다.
지식 폴더에는 `.gitkeep`만 두고 실제 자료는 나중에 추가하도록 했다.

## 구현 내용

| 구분 | 파일 | 내용 |
|---|---|---|
| API | `backend/app/api/ask.py` | `POST /api/ask`, 질문을 받아 공통 Envelope로 답변 반환 |
| 스키마 | `backend/app/models/rag.py` | 질문 검증, 답변 상태, 출처·발췌·유사도 정의 |
| 검색·생성 | `backend/app/rag/retrieve.py` | cosine distance를 유사도로 변환, 근거 선별, LLM 답변과 출처 반환 |
| 저장소 | `backend/app/rag/store.py` | vecs 연결 정리, 메타데이터 포함 검색, 문서별 청크 교체 |
| 자료 적재 | `backend/app/rag/ingest.py` | 하위 폴더의 UTF-8 `.md`·`.txt` 분할·임베딩·적재 |
| 적재 명령 | `utils/scripts/ingest_rag.py` | 지정한 자료 폴더를 실제 적재 함수에 전달하고 오류 시 실패 종료 |
| 자료 위치 | `backend/app/rag/knowledge/` | 실제 지식 자료 없이 시작 |
| 설정 | `backend/app/config.py`, `.env.example` | 컬렉션, 검색 수, 유사도 기준, 차원, 역할 프롬프트 설정 |
| 앱 연결 | `backend/app/main.py` | 질문 API 등록, API 뒤에 정적 파일 등록, 요청 검증 오류의 Envelope 처리 |
| LLM 연결 | `backend/app/services/llm/` | 임베딩·답변 호출의 시간 제한과 재시도 횟수 설정 |
| 화면 | `frontend/index.html`, `frontend/js/rag.js`, `frontend/css/rag.css` | 질문·답변 내역, 참고 자료 펼치기, 대화 지우기, 대기·빈 결과·오류 안내 |
| 검증 | `backend/tests/test_rag.py` | 외부 DB·LLM을 대체한 RAG 및 API 테스트 |

루트 `.env`를 실행 위치와 관계없이 읽도록 수정했다.
README와 작업 절차의 서버 시작 명령도 `app.main:app --app-dir backend` 방식으로 정리했다.

## 동작 계약

질문 → 임베딩 → pgvector 검색 → 유사도 기준에 따른 근거 선별 → LLM 답변과 출처 반환.

- `not_configured`: DB 연결 설정이 없음. LLM 답변을 생성하지 않는다.
- `no_evidence`: 검색 근거가 없음. LLM 답변을 생성하지 않는다.
- `answered`: 검색 근거를 LLM에 제공하고 답변을 생성했다.
- DB·임베딩·LLM 장애: 빈 검색 결과와 구분해 오류 응답을 반환한다.

`grounded=true`는 검색 근거를 제공했다는 의미이며, 답변 전체의 사실성을 자동 검증했다는 뜻은 아니다.
화면에 대화 내역은 표시하지만 각 질문은 독립적이며 이전 대화를 모델에 전달하지 않는다.

## 검증 결과

아래 명령을 `backend` 폴더에서 실행해 **29개 테스트가 통과**했다.

```powershell
../.venv/Scripts/python.exe -m pytest tests/core tests/test_rag.py -q
```

검증 범위:

- 기존 Core 테스트
- 홈페이지·헬스·기존 Topic·신규 질문 API의 경로 접근
- 빈 질문·공백 질문·길이 초과 입력의 422 응답
- 거리에서 유사도로의 변환과 출처 메타데이터 처리
- 근거가 없을 때 LLM 호출 생략
- 답변과 출처 반환
- 검색·답변 생성 실패와 정상 빈 결과의 구분
- 빈 자료 폴더에서 키 없이 적재 명령 실행
- 같은 문서 재적재 및 짧아진 문서의 청크 교체 요청
- 임베딩 차원 불일치 시 기존 자료 교체 방지
- 저장소 검색 옵션과 문서별 삭제 범위

`node --check frontend/js/rag.js`와 `git diff --check`도 통과했다.
빈 지식 폴더로 적재 스크립트를 실행해 정상 안내 후 종료함을 확인했다.
테스트 중 라이브러리 deprecation 경고는 있었으나 실패는 없었다.

## 미검증 사항과 제약

- 실제 DB·임베딩·LLM 연결 및 자료 적재는 아직 검증하지 않았다.
- 브라우저 도구 연결 오류로 실제 화면의 렌더링과 클릭 동작은 직접 검증하지 못했다. API 테스트와 JavaScript 문법 검증까지 완료했다.
- PDF·Word 직접 적재는 지원하지 않는다. `.md`·`.txt` 변환이 필요하다.
- 문서 교체는 삭제 후 저장 순서이며 하나의 트랜잭션이 아니다. 중간 실패 시 재적재해야 한다.
- 파일 삭제·이름 변경에 따른 DB의 이전 출처 제거는 자동화하지 않았다.
- 모델·차원 변경 시 새 컬렉션에 전체 자료를 재적재해야 한다.
- 현재 질문 API는 인증 없는 데모용이다. 서비스 정책에 따른 인증·사용량 제한은 후속 작업이다.

## 다음 사용 순서

1. 루트 `.env`에 임베딩 키, DB 연결, 답변 모델 설정을 입력한다.
2. `backend/app/rag/knowledge/`에 주제별 자료를 추가한다.
3. 자료 적재 명령을 실행한다.
4. 서버를 시작하고 홈페이지에서 근거가 있는 질문과 없는 질문을 확인한다.

상세 명령과 설정은 [RAG 사용 안내](./rag_guide.md)를 참고한다.
이 기록 작성 시점에 이번 RAG 변경은 커밋·push하지 않았다.
