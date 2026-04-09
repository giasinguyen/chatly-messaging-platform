from functools import lru_cache

from minio import Minio
from minio.error import S3Error

from app.config import settings


@lru_cache(maxsize=1)
def get_minio_client() -> Minio:
    """Build singleton MinIO client."""
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def get_bucket_name() -> str:
    """Return configured upload bucket name."""
    return settings.minio_bucket_name


def ensure_bucket_exists(client: Minio, bucket_name: str) -> None:
    """Create bucket when missing to prevent NoSuchBucket at upload time."""
    if client.bucket_exists(bucket_name):
        return

    try:
        client.make_bucket(bucket_name)
    except S3Error as exc:
        # Another process may have created it between exists-check and create.
        if exc.code != "BucketAlreadyOwnedByYou":
            raise
