# 코드 순방향 인덱스 (파일 → 클래스/함수)
> 생성일: 2026-10-27 | 관련: [03-reverse-index.md](./03-reverse-index.md) | [01-repo-tree.md](./01-repo-tree.md)
> 핵심 파일 중심 — 전체 44개 테스트 파일·단순 유틸은 생략

---

## backend/app/main.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `lifespan` | async generator | FastAPI lifespan — 시작 시 핵심 키 존재 여부만 확인 |
| `app` | FastAPI | 앱 인스턴스 (CORS·라우터·예외핸들러 등록) |
| `_konnect_error_handler` | handler | KonnectError → Envelope(ok=False) 변환 |
| `_validation_error_handler` | handler | RequestValidationError → 422 Envelope |
| `health` | GET /health | 라이브니스 |
| `public_config` | GET /api/config | Naver Map Client ID·Supabase URL/publishable key 노출 |

## backend/app/config.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `Settings` | BaseSettings | 전체 환경변수 (pydantic-settings, `.env` 자동 로드) |
| `settings` | 싱글톤 | `Settings()` 인스턴스 |
| `Settings.cors_origins` | property | `CORS_ALLOW_ORIGINS` 쉼표 → list |
| `Settings.missing_keys` | method | 빈 키 이름 반환 (값 미출력) |
| `Settings.agent_orchestrator_model` | property | orchestrator_model 또는 openai_model |

## backend/app/agent/orchestrator.py (870줄, 핵심)
| 심볼 | 종류 | 역할 |
|------|------|------|
| `base_radius` | func | 걷기 선호 → 탐색 반경(m). True=1km, None=2km, False=3km |
| `_fetch_tour_pool` | async func | TourAPI 문화 3타입 병렬 조회 → 병합·중복제거 |
| `_fetch_seoul_pool` | async func | 서울문화포털 당일 행사 → 좌표 후필터 |
| `_fetch_pool` | async func | TourAPI+서울 병렬 → 거리순 정렬. TourAPI 실패 시 503 |
| `SourceRecord` | dataclass | 정규화 사실 + 판정 입력 묶음 (search/check 분리) |
| `_fetch_and_normalize` | async func | 상세 조회 → Candidate 정규화 (판정 안 함) |
| `collect_judged` | async func | 풀→상세→판정→반경 확장 ladder. 핵심 orchestration |
| `closed_candidate_ids` | async func | Hard 제외(CLOSED) 후보 ID 집합 |
| `_augment_with_keywords` | async func | 키워드 키 보강: 후보 부족 시 TourAPI keyword 조회 추가 |
| `recommend_a` | async func | **A 즉시추천 진입점** (ctx, trace, 저장선호 → RecommendData) |

## backend/app/agent/agent_loop.py (757줄, 핵심)
| 심볼 | 종류 | 역할 |
|------|------|------|
| `_asked_io_conflict` | func | 직전 어시스턴트가 실내외 충돌 질문을 이미 했는지 판정 |
| `LoopState` | dataclass | 루프 중간 상태 (추천결과, 루트, FAQ 답변, 히스토리) |
| `_run_recommend_or_route` | async func | 루프 내 tool 실행 (RecommendExperiences or PlanCultureRoute) |
| `_run_knowledge` | async func | 루프 내 FAQ 실행 (AnswerTravelQuestion) |
| `run_chat_loop` | async func | **챗봇 agentic while-loop 진입점** (최대 6스텝) |

## backend/app/agent/chat_agent.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `has_trip_context` | func | ChatContext에 필수 여행 정보(위치·시간)가 있는지 |
| `to_lc_messages` | func | ChatTurn 리스트 → LangChain BaseMessage 변환 |
| `run_chat` | async func | 단일 라우팅 fallback (agent_loop=False 시 사용) |

## backend/app/agent/classify.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `PlaceVerdict` | Pydantic | 후보별 LLM 분류 결과 (setting, fits_vibe) |
| `PlaceClassification` | Pydantic | 복수 PlaceVerdict 컨테이너 |
| `classify_places` | async func | (id,text) 리스트 → {id: PlaceVerdict}. 실패시 {} |

## backend/app/agent/semantic_rank.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `build_intent_text` | func | ParsedConditions → 임베딩용 의도 텍스트. note 원문 제외 |
| `pool_item_text` | func | 목록 단계 후보의 의미 비교용 텍스트 (상세조회 전) |
| `semantic_similarities` | async func | 의도 vs 후보 코사인 유사도 dict |

## backend/app/agent/note_parser.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `parse_note` | async func | 자연어 note → ParsedConditions (LLM structured output) |

## backend/app/agent/exclude_classifier.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `ExcludeVerdict` | Pydantic | 후보별 배제 매칭 여부 |
| `classify_excluded` | async func | 후보 vs 배제 개념 LLM 의미분류 → 매칭 id set |

## backend/app/agent/hours_parser.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `parse_hours_llm` | async func | 자유기술 운영시간 → 구조화 재추출 (UNCERTAIN 후보만 호출) |

## backend/app/domain/exclusion.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `lexical_excluded` | func | 제목 키워드 매칭 배제 (단일어, 단어경계 정규식) |
| `match_excluded_places` | func | 명시 장소명 부분일치 배제 |
| `select_with_exclusion` | func | 배제 적용 + **0건-세이프** (비면 배제 무효화+안내) |

## backend/app/domain/timing.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `TimingVerdict` | Enum | OPEN / CLOSED / UNCERTAIN |
| `EventPeriod` | Enum | ACTIVE / ENDED / UPCOMING / UNKNOWN |
| `judge_event_period` | func | TourAPI 날짜형 콘텐츠 개최기간 판정 |
| `judge_timing` | func | 운영시간 vs 요청 시간창 판정 (결정론, LLM 미사용) |
| `judge_extracted_hours` | func | LLM 재추출 운영시간 판정 |
| `operating_hours_text` | func | 사용자-facing 운영시간 표시 문자열 |
| `resolve_prose_window` | func | 자연어 시간표현("오후 3시부터") → 시간창 해석 |
| `should_retry_hours_with_llm` | func | UNCERTAIN 후보를 LLM 재추출 대상으로 볼지 판정 |

## backend/app/domain/normalize.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `normalize_candidate` | func | TourAPI 상세 → Candidate 스키마 (price unknown≠free) |
| `normalize_seoul_event` | func | 서울문화포털 행사 → Candidate |
| `_valid_seoul_coords` | func | LOT/LAT 뒤바뀜 보정 + 한국 좌표 범위 검증 |
| `enrich_intro` | func | TourAPI detailInfo2 보강 (요금·시간 fallback) |

## backend/app/domain/ranking.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `TYPE_INTERESTS` | dict | ExperienceType → 충족 InterestCode 매핑 |
| `type_preference_rank` | func | 유형 기준 0=선호/1=중립/2=비선호 |
| `io_rank` | func | 실내외 선호 vs 유형 Soft 강등 점수 |
| `display_sort_key` | func | 표시 순서 정렬 키 (상태→관심사→실내외→거리) |

## backend/app/domain/reasons.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `REASON_COPY` | dict | Reason ID → 사용자-facing 고정 문구 (LLM 생성 아님) |
| `select_reasons` | func | 후보+조건+판정 → 최대 2개 Reason 선택 |

## backend/app/domain/operational.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `PresenceVerdict` | Enum | PRESENT / ABSENT / UNKNOWN |
| `judge_presence` | func | Google Places businessStatus 폐업 Hard 제외 판정 |

## backend/app/domain/budget.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `BudgetVerdict` | Enum | FITS / OVER / UNKNOWN |
| `judge_budget` | func | 후보 요금 vs 예산·무료필터 판정 |

## backend/app/domain/status.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `resolve_status` | func | TimingVerdict+BudgetVerdict → ResultStatus 3상태 결정 |

## backend/app/rag/retrieve.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `SIM_THRESHOLD` | const | 0.35 (근거 판정 임계치) |
| `filter_grounded` | func | 유사도 임계치 이상 근거만 선별 |
| `answer_question` | async func | RAG 전체 흐름 (임베딩→검색→판정→LLM답변 or refuse) |

## backend/app/core/auth.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `AuthUser` | dataclass | 검증된 사용자 신원 (id, is_anonymous, role) |
| `verify_token` | async func | JWT → AuthUser (JWKS 비대칭 검증) |
| `get_optional_user` | async func | FastAPI Depends — 토큰 없으면 None |
| `get_current_user` | async func | FastAPI Depends — 토큰 필수, 없으면 AuthError(401) |

## backend/app/core/exceptions.py
| 심볼 | 종류 | 역할 |
|------|------|------|
| `KonnectError` | base | 공통 예외 |
| `ExternalSourceError` | class | 외부 API 실패 → 503 |
| `ValidationFailure` | class | 입력 오류 → 422 |
| `AuthError` | class | 인증 실패 → 401 |

## backend/app/models/recommend.py (핵심 스키마)
| 심볼 | 종류 | 역할 |
|------|------|------|
| `InterestCode` | Enum | 관심사 6종 코드 |
| `ParsedConditions` | Pydantic | LLM 구조화 조건 (interests, exclude_concepts, open_preferences 등) |
| `Candidate` | Pydantic | 추천 후보 1건 (name, status, price, timing, reasons, movement) |
| `RecommendData` | Pydantic | 추천 응답 전체 (candidates, notices, widened_search, environment) |
| `StartLocation` | Pydantic | 출발지 (coords 또는 address) |

## frontend/js/app.js
| 심볼 | 종류 | 역할 |
|------|------|------|
| `mount` | func | #view 컨테이너에 DOM 주입 (fullBleed 토글) |
| `showWelcome` | func | 웰컴 뷰 (1회, localStorage 기록) |
| `showHome` | func | 홈 뷰 + 위치 권한 사전 요청 |
| `showInput` | func | A 입력 폼 뷰 |
| `showChat` | func | B 챗봇 뷰 (로그인 필수) |
| `showResults` | func | A 추천 결과 뷰 |
| `showSavedChoice` | func | My Pick 현재 선택 뷰 |
| `hideSplash` | func | cold start 스플래시 제거 |

## frontend/js/state.js
| 심볼 | 종류 | 역할 |
|------|------|------|
| `state` | object | 전역 상태 (request, candidates, focusedId, selectedId) |
| `isLoggedIn` | func | 비익명 정식 로그인 여부 (FR-L1 게이팅) |
| `markGuestRecommended` | func | 비회원 1회 추천 사용 기록 (localStorage) |
| `guestRecommendUsed` | func | 비회원 1회 이미 사용했는지 |
| `setResults` | func | 추천 결과 상태 갱신 |
| `ensureCurrentLocation` | func | GPS 권한 1회 요청·캐시 (멱등) |

## frontend/js/api.js
| 심볼 | 종류 | 역할 |
|------|------|------|
| `request` | func | 공통 fetch 래퍼 (JWT 부착, Envelope 반환) |
| `postRecommend` | func | POST /api/recommend (AbortController 지원) |
| `postRoute` | func | POST /api/route |
| `postChat` | func | POST /api/chat |
| `translateTexts` | func | POST /api/translate |
| `postParse` | func | POST /api/parse |
| `getSession` / `putSession` | func | GET/PUT /api/session |
| `getPreferences` / `putPreferences` | func | GET/PUT /api/preferences |
| `getChatHistory` / `clearChatHistory` | func | GET/DELETE /api/chat/history |

## frontend/js/auth.js
| 심볼 | 종류 | 역할 |
|------|------|------|
| `ready` | func | 초기화 완료 Promise (Supabase 클라이언트 생성 + 세션 로드) |
| `onAuthChange` | func | 세션 변경 구독 (화면 재렌더 트리거) |
| `isSignedIn` | func | 정식 로그인(비익명) 여부 동기 플래그 |
| `getToken` | async func | 현재 세션 JWT 반환 |
| `signInWithGoogle` | async func | Google OAuth 시작 |
| `signOut` | async func | 로그아웃 |

## frontend/js/map.js
| 심볼 | 종류 | 역할 |
|------|------|------|
| `loadNaver` | async func | Naver Maps SDK 동적 로드 (도메인 미등록 시 false) |
| `initResultMap` | async func | A 결과 지도 초기화 (Start 핀 + 후보 번호/유형 핀) |
| `focusPin` | func | 선택 후보 핀 확대 + 카메라 pan |
| `drawRouteLines` | func | B 루트 경로선 (흰 테두리 + 청록, Tmap path 있을 때만) |
