import os


def _set_required_env() -> None:
    os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
    os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
    os.environ.setdefault("MONGODB_DB_NAME", "agent_server_test")
    os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
    os.environ.setdefault("QDRANT_API_KEY", "")
    os.environ.setdefault("QDRANT_COLLECTION_NAME", "agent_server_chunks_test")
    os.environ.setdefault("QDRANT_VECTOR_SIZE", "768")
    os.environ.setdefault("HUGGINGFACE_API_KEY", "test-hf-key")
    os.environ.setdefault("HF_EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
    os.environ.setdefault("MINIO_ENDPOINT", "localhost:9000")
    os.environ.setdefault("MINIO_ACCESS_KEY", "minioadmin")
    os.environ.setdefault("MINIO_SECRET_KEY", "minioadmin")
    os.environ.setdefault("MINIO_SECURE", "false")
    os.environ.setdefault("MINIO_BUCKET_NAME", "uploads")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")


_set_required_env()
