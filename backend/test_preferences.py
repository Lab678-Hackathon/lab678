"""대화→조건→추천 경계. 복수 관심사·제외·가격 미확인·확정값 보호를 재현한다."""
from copy import deepcopy
import json
import unittest
from unittest.mock import patch

from chat_conditions import apply_interpretation, resolve_changes
from outing import EXAMPLES, InputError, recommend
from preferences import apply, normalize


class PreferenceTests(unittest.TestCase):
    """실제 기록과 명시적 모의 공식 행사를 구분해 조건 반영을 확인한다."""

    def setUp(self):
        """기존 QA 입력과 독립된 공식 응답 모양의 행을 준비한다."""
        self.request = json.loads((EXAMPLES / "outing-request.json").read_bytes())
        self.row = json.loads((EXAMPLES / "seoul-events.capture.json").read_bytes())["captures"][0]["rows"][0]
        self.row.update(PRO_TIME="14:00", STRTDATE="2026-10-01", END_DATE="2026-11-30")

    def test_music_discovery_then_broad_accept(self):
        """음악→골고루는 분류를 강요하지 않고 같은 초안의 세 분류를 유지한다."""
        first = apply_interpretation({}, dict(categories=["국악", "클래식", "콘서트"], music_followup=True), [], 0, 0)
        self.assertIn("어떤 음악", first["assistant_text"])
        self.assertFalse(first["ready_to_search"])
        second = apply_interpretation(first["updated_condition_draft"], {"music_followup": False}, [], 1, 1)
        self.assertEqual(second["updated_condition_draft"]["categories"], ["국악", "클래식", "콘서트"])
        self.assertIn("어디에서", second["assistant_text"])

    def test_confirmed_categories_atomic(self):
        """대표 분류 변경을 거절하면 연결된 복수 분류도 변경되지 않는다."""
        result = apply_interpretation(self.request, {"categories": ["국악", "콘서트"]}, ["category"], 1, 1)
        self.assertEqual(result["updated_condition_draft"]["category"], "전시")
        denied = resolve_changes(result, {"category": False}, result["updated_condition_draft"], 1)
        self.assertNotIn("categories", denied["updated_condition_draft"])
        accepted = resolve_changes(result, {"category": True}, result["updated_condition_draft"], 1)
        self.assertEqual(accepted["updated_condition_draft"]["categories"], ["국악", "콘서트"])

    def test_multiple_categories_query_and_dedup(self):
        """분류별 조회 후 ID 중복을 제거하고 장르 밖 후보를 제외한다."""
        def source(day, category, mode):
            """두 음악 장르와 공통 행을 돌려주는 모의 공급자다."""
            row = dict(self.row, CODENAME=category, HMPG_ADDR=f"https://culture.seoul.go.kr/event?cultcode={1 if category == '국악' else 2}")
            return [row, dict(self.row, CODENAME="국악")], "2026-10-31", 2
        with patch("outing.seoul_page", side_effect=source) as mocked:
            result = recommend(dict(self.request, categories=["국악", "콘서트"]))
        self.assertEqual(mocked.call_count, 2)
        self.assertEqual(len(result["candidates"]), 3)
        self.assertEqual(result["queried_categories"], ["국악", "콘서트"])

    def test_no_partial_success_when_one_source_fails(self):
        """한 관심사 조회 실패를 0건/다른 분류 성공으로 숨기지 않는다."""
        with patch("outing.seoul_page", side_effect=RuntimeError("source failed")), self.assertRaises(RuntimeError):
            recommend(dict(self.request, categories=["국악", "콘서트"]))

    def test_same_id_with_different_official_url_once(self):
        """메뉴 쿼리가 다른 동일 행사도 후보 ID 기준으로 한 번만 반환한다."""
        rows = [dict(self.row, CODENAME="국악", HMPG_ADDR=f"https://culture.seoul.go.kr/event?cultcode=1&menu={i}") for i in (1, 2)]
        with patch("outing.seoul_page", return_value=(rows, "2026-10-31", 2)):
            result = recommend(dict(self.request, category="국악"))
        self.assertEqual([c["id"] for c in result["candidates"]], ["seoul:1"])

    def test_budget_excludes_unknown_and_multiple_prices(self):
        """1인 관람료 한도는 미확인·할인·복수좌석을 충족으로 간주하지 않는다."""
        base = dict(title="전시", venue="전시장", genre="전시", district=None, distance_km=1, fee_type="유료")
        prices = ["전석 20,000원", "VIP석 7만원 R석 6만원", None, "30,000원", "무료(일부 유료)"]
        candidates = [dict(base, id=str(i), price_info=price) for i, price in enumerate(prices)]
        result, assessment = apply(candidates, {"budget_krw": 20000})
        self.assertEqual([c["id"] for c in result], ["0"])
        self.assertEqual(assessment["unknown_price_count"], 3)
        self.assertEqual(assessment["excluded_count"], 1)

    def test_exclusion_never_restored_when_zero(self):
        """모든 기록 후보를 제외해도 제한을 완화하거나 샘플로 대체하지 않는다."""
        result = recommend(dict(self.request, free_only=True, exclude_terms=["전시", "미술"]), "recorded")
        self.assertEqual(result["status"], "no_results")
        self.assertEqual(result["candidates"], [])

    def test_keyword_and_short_walk_order(self):
        """관심어 우선과 가까운 곳 우선은 순서를 실제로 바꾸며 도보 보장은 하지 않는다."""
        candidates = [dict(id="near", title="도자기", venue="홀", genre="전시", distance_km=1),
                      dict(id="far", title="그림", venue="홀", genre="전시", distance_km=5)]
        result, _ = apply(deepcopy(candidates), {"keywords": ["그림"]})
        self.assertEqual(result[0]["id"], "far")
        result, info = apply(deepcopy(candidates), {"keywords": ["그림"], "walking_preference": "short"})
        self.assertEqual(result[0]["id"], "near")
        self.assertIn("미확인", info["preference_notes"][0])

    def test_unverified_hard_requirement_blocks_before_source(self):
        """계단 없음 등 필수 제약을 검증 못하면 외부 호출 전 명시적으로 차단한다."""
        with patch("outing.seoul_page") as source, self.assertRaises(InputError) as error:
            recommend(dict(self.request, unsupported_requirements=["계단 없는 곳만"]))
        self.assertEqual(error.exception.code, "unsupported_constraint")
        source.assert_not_called()

    def test_invalid_and_explicit_clear(self):
        """잘못된 형식을 거절하며 명시적 false/any/빈 목록은 보존한다."""
        for bad in ({"categories": []}, {"categories": ["전체", "국악"]}, {"free_only": "yes"},
                    {"budget_krw": True}, {"exclude_terms": "전시"}, {"keywords": ["\n"]}):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                normalize(bad)
        self.assertEqual(normalize(dict(free_only=False, budget_krw="any", exclude_terms=[])),
                         dict(free_only=False, budget_krw="any", exclude_terms=[]))
        result = apply_interpretation({}, {"music_followup": False}, [], 0, 0)
        self.assertNotIn("category", result["updated_condition_draft"])


if __name__ == "__main__":
    unittest.main()
