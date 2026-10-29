from functools import cached_property
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    backend_port: int = 8000
    cors_allow_origins: str = "http://localhost:5500,http://127.0.0.1:5500"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # LLM Provider
    llm_provider: str = "openai"
    naito_base_url: str = ""
    naito_api_key: str = ""
    naito_model: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_db_url: str = ""

    @cached_property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def rag_enabled(self) -> bool:
        return bool(self.supabase_db_url)

    def missing_keys(self) -> list[str]:
        required = ["openai_api_key", "supabase_url", "supabase_publishable_key", "supabase_secret_key"]
        return [k for k in required if not getattr(self, k)]


settings = Settings()
