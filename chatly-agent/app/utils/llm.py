from functools import lru_cache

from langchain_groq import ChatGroq

from app.config import settings


@lru_cache(maxsize=4)
def get_llm(
    model: str = settings.groq_model,
    temperature: float = 0.0,
    streaming: bool = False,
) -> ChatGroq:
    """Create or reuse a ChatGroq instance by model settings."""
    return ChatGroq(
        model_name=model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        streaming=streaming,
    )
