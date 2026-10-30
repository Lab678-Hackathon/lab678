"""AppError 계층 단위 테스트."""
import pytest
from app.core.exceptions import (
    AppError, ExternalSourceError, ValidationFailure, AuthError, ConfigurationError
)


def test_app_error_defaults():
    e = AppError("test error")
    assert e.message == "test error"
    assert e.status_code == 500


def test_external_source_error():
    e = ExternalSourceError("API timeout")
    assert e.status_code == 503
    assert isinstance(e, AppError)


def test_validation_failure():
    e = ValidationFailure("Invalid input")
    assert e.status_code == 422


def test_auth_error_default_message():
    e = AuthError()
    assert e.status_code == 401
    assert "Unauthorized" in e.message


def test_configuration_error():
    e = ConfigurationError("NAITO_API_KEY not set")
    assert e.status_code == 500
    assert isinstance(e, AppError)


def test_inheritance():
    for cls in [ExternalSourceError, ValidationFailure, AuthError, ConfigurationError]:
        assert issubclass(cls, AppError)
