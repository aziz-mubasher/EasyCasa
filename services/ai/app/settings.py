from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://easycasa:change_me_strong@db:5432/easycasa"

    # Embeddings: hashing (offline default) | openai | local
    EMBEDDING_PROVIDER: str = "hashing"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536  # matches listings.embedding vector(1536)

    # Chat/LLM: none (templated fallback) | openai
    CHAT_PROVIDER: str = "none"
    CHAT_MODEL: str = "gpt-4o-mini"
    USE_LLM_NLQ: bool = False

    # OpenAI-compatible endpoint (works with OpenAI, Ollama /v1, TEI, LiteLLM...)
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_API_KEY: str = ""

    HTTP_TIMEOUT: float = 20.0
    AI_RATE_LIMIT_PER_MIN: int = 30
    REDIS_URL: str = "redis://redis:6379"


@lru_cache
def get_settings() -> Settings:
    return Settings()
