class AppError(Exception):
    """공통 베이스 예외. main.py 핸들러가 Envelope(ok=False)로 변환."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ExternalSourceError(AppError):
    """외부 API 호출 실패 → 503."""
    def __init__(self, message: str):
        super().__init__(message, status_code=503)


class ValidationFailure(AppError):
    """입력값 검증 실패 → 422."""
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class AuthError(AppError):
    """인증 실패 → 401."""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class ConfigurationError(AppError):
    """필수 설정 누락 → 500."""
    def __init__(self, message: str):
        super().__init__(message, status_code=500)
