"""Envelope 모델 단위 테스트."""
from app.models.common import Envelope, ErrorDetail


def test_ok_response():
    env = Envelope.ok_response(data={"key": "value"})
    assert env.ok is True
    assert env.data == {"key": "value"}
    assert env.error is None


def test_error_response():
    env = Envelope.error_response(code="AuthError", message="Unauthorized")
    assert env.ok is False
    assert env.data is None
    assert env.error.code == "AuthError"
    assert env.error.message == "Unauthorized"


def test_ok_response_with_trace():
    trace = [{"step": "parse", "elapsed_ms": 10, "data": {}}]
    env = Envelope.ok_response(data="result", trace=trace)
    assert env.trace == trace


def test_generic_type():
    env: Envelope[list[int]] = Envelope.ok_response(data=[1, 2, 3])
    assert env.data == [1, 2, 3]


def test_error_detail_model():
    detail = ErrorDetail(code="TestError", message="test")
    assert detail.code == "TestError"
