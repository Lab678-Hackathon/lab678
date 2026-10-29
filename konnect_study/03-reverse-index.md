# 역방향 인덱스 (함수/클래스 → 파일 위치)
> 생성일: 2026-10-27 | 관련: [02-code-index.md](./02-code-index.md)
> 알파벳순 정렬. "어디서 정의됐나" 를 바로 찾기 위한 테이블.

---

## A

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `answer_question` | `rag/retrieve.py` | `agent/tools/knowledge.py`, `api/ask.py` |
| `append_messages` | `db/chat.py` | `api/chat.py` |
| `assemble_route` | `domain/route.py` | `agent/route_orchestrator.py` |
| `AuthUser` | `core/auth.py` | 모든 api/ 라우터 (Depends) |

## B

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `base_radius` | `agent/orchestrator.py` | `orchestrator.recommend_a`, `route_orchestrator` |
| `BudgetVerdict` | `domain/budget.py` | `orchestrator`, `route_orchestrator`, `domain/status.py` |
| `build_intent_text` | `agent/semantic_rank.py` | `agent/orchestrator.py` |
| `build_schedule` | `domain/route.py` | `agent/route_orchestrator.py` |

## C

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `Candidate` | `models/recommend.py` | orchestrator, normalize, domain/*  |
| `classify_excluded` | `agent/exclude_classifier.py` | `orchestrator.py`, `route_orchestrator.py` |
| `classify_places` | `agent/classify.py` | `orchestrator.py`, `route_orchestrator.py` |
| `clear_messages` | `db/chat.py` | `api/chat.py` (DELETE /chat/history) |
| `closed_candidate_ids` | `agent/orchestrator.py` | `orchestrator.recommend_a` |
| `collect_judged` | `agent/orchestrator.py` | `recommend_a`, `route_orchestrator` |
| `conflict_notice` | `domain/conflict.py` | `orchestrator`, `route_orchestrator` |

## D

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `dedup_cross_source` | `domain/dedup.py` | `orchestrator._fetch_pool` |
| `detect_location_in_text` | `domain/locations.py` | `orchestrator`, `agent_loop` |
| `display_sort_key` | `domain/ranking.py` | `orchestrator` (최종 정렬) |

## E

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `embed_documents` | `rag/embed.py` | `rag/ingest.py` |
| `embed_query` | `rag/embed.py` | `rag/retrieve.py`, `agent/semantic_rank.py` |
| `enrich_intro` | `domain/normalize.py` | `orchestrator._fetch_and_normalize` |
| `EventPeriod` | `domain/timing.py` | `orchestrator`, `route_orchestrator` |
| `ExternalSourceError` | `core/exceptions.py` | `sources/*.py`, `orchestrator` |

## F

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `filter_grounded` | `rag/retrieve.py` | `answer_question` (내부) |
| `find_place` | `sources/gplaces.py` | `domain/operational.py` |

## G

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `get_current_user` | `core/auth.py` | `api/chat.py` (GET /chat/history) |
| `get_messages` | `db/chat.py` | `api/chat.py` |
| `get_optional_user` | `core/auth.py` | `api/recommend.py`, `api/chat.py`, `api/route.py` |
| `get_preferences` | `db/preferences.py` | `api/recommend.py`, `api/chat.py`, `api/route.py` |

## H

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `has_trip_context` | `agent/chat_agent.py` | `agent_loop.py` |
| `haversine_m` | `domain/route.py` | `orchestrator._fetch_seoul_pool` |

## I

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `InterestCode` | `models/recommend.py` | `agent/semantic_rank.py`, `domain/ranking.py` 등 전체 |
| `io_rank` | `domain/ranking.py` | `orchestrator` |
| `is_cultural_experience` | `domain/curation.py` | `orchestrator._fetch_tour_pool` |

## J

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `judge_budget` | `domain/budget.py` | `orchestrator.collect_judged` |
| `judge_event_period` | `domain/timing.py` | `orchestrator._fetch_and_normalize` |
| `judge_extracted_hours` | `domain/timing.py` | `orchestrator` (LLM 재추출 후) |
| `judge_presence` | `domain/operational.py` | `orchestrator.closed_candidate_ids` |
| `judge_timing` | `domain/timing.py` | `orchestrator.collect_judged` |

## L

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `lexical_excluded` | `domain/exclusion.py` | `orchestrator`, `route_orchestrator` |
| `location_based_list` | `sources/tourapi.py` | `orchestrator._fetch_tour_pool` |

## M

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `match_excluded_places` | `domain/exclusion.py` | `orchestrator`, `route_orchestrator` |
| `merge_saved_interests` | `domain/preferences_merge.py` | `orchestrator.recommend_a` |

## N

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `normalize_candidate` | `domain/normalize.py` | `orchestrator._fetch_and_normalize` |
| `normalize_seoul_event` | `domain/normalize.py` | `orchestrator._fetch_and_normalize` |

## P

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `parse_note` | `agent/note_parser.py` | `api/recommend.py`, `orchestrator`, `agent_loop` |
| `ParsedConditions` | `models/recommend.py` | 전체 — 조건 구조화의 핵심 스키마 |
| `pedestrian_route` | `sources/tmap.py` | `domain/route.py` |
| `pool_item_text` | `agent/semantic_rank.py` | `agent/orchestrator.py` |
| `PresenceVerdict` | `domain/operational.py` | `orchestrator.closed_candidate_ids` |

## R

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `REASON_COPY` | `domain/reasons.py` | `select_reasons` (내부) |
| `RecommendData` | `models/recommend.py` | `api/recommend.py`, `orchestrator.recommend_a` |
| `recommend_a` | `agent/orchestrator.py` | `api/recommend.py` |
| `recommend_route` | `agent/route_orchestrator.py` | `api/route.py`, `agent/tools/route.py` |
| `RequestContext` | `agent/context.py` | `api/recommend.py`, `api/route.py`, `agent_loop` |
| `resolve_start_coords` | `domain/locations.py` | `orchestrator.recommend_a` |
| `resolve_status` | `domain/status.py` | `orchestrator.collect_judged` |
| `run_chat` | `agent/chat_agent.py` | `api/chat.py` (agent_loop=False 시) |
| `run_chat_loop` | `agent/agent_loop.py` | `api/chat.py` (agent_loop=True 시) |

## S

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `select_reasons` | `domain/reasons.py` | `orchestrator.recommend_a`, `route_orchestrator` |
| `select_with_exclusion` | `domain/exclusion.py` | `orchestrator`, `route_orchestrator` |
| `semantic_similarities` | `agent/semantic_rank.py` | `orchestrator` |
| `settings` | `app/config.py` | 모든 모듈 (전역 싱글톤) |
| `Settings` | `app/config.py` | `app/config.py` (싱글톤 생성) |
| `SourceRecord` | `agent/orchestrator.py` | `orchestrator._fetch_and_normalize`, `collect_judged` |

## T

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `TimingVerdict` | `domain/timing.py` | `orchestrator`, `route_orchestrator`, `domain/status.py` |
| `Trace` | `core/trace.py` | 모든 api/ 라우터 + agent/ |
| `TYPE_INTERESTS` | `domain/ranking.py` | `domain/reasons.py` (공유 정본) |
| `type_preference_rank` | `domain/ranking.py` | `orchestrator` |

## V

| 심볼 | 파일 | 호출처 |
|------|------|--------|
| `validate_available_time` | `domain/input_validation.py` | `api/recommend.py`, `api/route.py`, `agent_loop` |
| `verify_token` | `core/auth.py` | `get_optional_user`, `get_current_user` |

---

## 핵심 의존성 흐름

```
api/recommend.py
  → agent/orchestrator.recommend_a
    → agent/orchestrator._fetch_pool
      → sources/tourapi.location_based_list
      → sources/seoulculture.cultural_events
      → domain/dedup.dedup_cross_source
    → agent/orchestrator._fetch_and_normalize
      → domain/normalize.normalize_candidate
      → domain/timing.judge_event_period
    → agent/orchestrator.collect_judged
      → domain/timing.judge_timing
      → domain/budget.judge_budget
      → domain/operational.judge_presence (+ sources/gplaces.find_place)
      → domain/status.resolve_status
    → agent/classify.classify_places          ← LLM #1 (경량 모델)
    → agent/semantic_rank.semantic_similarities ← OpenAI Embedding
    → agent/exclude_classifier.classify_excluded ← LLM #2 (경량 모델)
    → domain/exclusion.select_with_exclusion  ← 0건-세이프
    → domain/ranking.display_sort_key
    → domain/reasons.select_reasons
    → [Tmap 경로 호출] sources/tmap.pedestrian_route
    → agent/environment.get_environment       ← sources/kma + sources/airkorea

api/chat.py
  → agent/agent_loop.run_chat_loop (agent_loop=True)
    → agent/chat_agent.run_chat (fallback)
    → agent/tools/experiences → orchestrator.recommend_a
    → agent/tools/route → route_orchestrator.recommend_route
    → agent/tools/knowledge → rag/retrieve.answer_question
```
