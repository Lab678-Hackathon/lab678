"""
도메인 판정 로직 템플릿.
규칙: LLM 호출 없음. 결정론적 코드만. 외부 I/O 없음.
복사 후 [FEATURE], Verdict 항목 교체.
"""
from enum import Enum
from dataclasses import dataclass


class [Feature]Verdict(Enum):
    PASS = "pass"
    FAIL = "fail"
    UNKNOWN = "unknown"


@dataclass
class [Feature]Input:
    """판정에 필요한 입력값."""
    value: str  # 실제 필드로 교체


def judge_[feature](input: [Feature]Input) -> [Feature]Verdict:
    """
    결정론적 판정. 조건을 코드로 명시한다.
    미확인 값을 긍정(PASS)으로 바꾸지 않는다.
    """
    if not input.value:
        return [Feature]Verdict.UNKNOWN

    if [condition]:
        return [Feature]Verdict.FAIL

    return [Feature]Verdict.PASS
