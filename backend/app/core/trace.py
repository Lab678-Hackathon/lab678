import time
from dataclasses import dataclass, field


@dataclass
class Trace:
    """AI 파이프라인 단계별 추적. 개발 환경에서 응답에 포함."""
    _steps: list[dict] = field(default_factory=list, repr=False)
    _start: float = field(default_factory=time.monotonic, repr=False)

    def step(self, name: str, data: dict | None = None) -> None:
        self._steps.append({
            "step": name,
            "elapsed_ms": round((time.monotonic() - self._start) * 1000),
            "data": data or {},
        })

    def to_dict(self) -> list[dict]:
        return self._steps
