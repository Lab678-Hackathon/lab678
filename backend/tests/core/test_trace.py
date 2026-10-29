"""Trace 단위 테스트."""
import time
from app.core.trace import Trace


def test_step_records():
    t = Trace()
    t.step("parse", {"input": "hello"})
    t.step("fetch")
    steps = t.to_dict()
    assert len(steps) == 2
    assert steps[0]["step"] == "parse"
    assert steps[0]["data"] == {"input": "hello"}
    assert steps[1]["step"] == "fetch"


def test_elapsed_ms_increases():
    t = Trace()
    t.step("first")
    time.sleep(0.01)
    t.step("second")
    steps = t.to_dict()
    assert steps[1]["elapsed_ms"] >= steps[0]["elapsed_ms"]


def test_empty_data_defaults():
    t = Trace()
    t.step("step_no_data")
    assert t.to_dict()[0]["data"] == {}


def test_to_dict_returns_list():
    t = Trace()
    assert isinstance(t.to_dict(), list)
