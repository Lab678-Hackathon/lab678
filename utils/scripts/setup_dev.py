"""
개발 환경 초기 세팅 확인 스크립트.
python utils/scripts/setup_dev.py
"""
import os
import sys

REQUIRED = [
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
]

OPTIONAL = [
    "SUPABASE_DB_URL",
    "NAITO_BASE_URL",
    "NAITO_API_KEY",
    "NAITO_MODEL",
]

def check():
    missing = [k for k in REQUIRED if not os.getenv(k)]
    unset_optional = [k for k in OPTIONAL if not os.getenv(k)]

    if missing:
        print("❌ 필수 환경변수 누락:")
        for k in missing:
            print(f"   {k}")
        sys.exit(1)

    print("✅ 필수 환경변수 확인 완료")

    if unset_optional:
        print("⚠️  선택 환경변수 미설정 (기능 제한):")
        for k in unset_optional:
            print(f"   {k}")

    provider = os.getenv("LLM_PROVIDER", "openai")
    print(f"ℹ️  LLM_PROVIDER: {provider}")

    db_url = os.getenv("SUPABASE_DB_URL", "")
    print(f"ℹ️  RAG: {'활성' if db_url else '비활성 (SUPABASE_DB_URL 없음)'}")

if __name__ == "__main__":
    check()
