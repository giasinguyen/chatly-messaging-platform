from functools import lru_cache

from langchain_huggingface import HuggingFaceEndpointEmbeddings

from app.config import settings


@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEndpointEmbeddings:
    """Build singleton Hugging Face embedding client."""
    return HuggingFaceEndpointEmbeddings(
        model=settings.hf_embedding_model,
        huggingfacehub_api_token=settings.huggingface_api_key,
    )
