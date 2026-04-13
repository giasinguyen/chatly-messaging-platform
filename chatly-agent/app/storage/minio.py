from functools import lru_cache

from minio import Minio
from minio.error import S3Error

from app.config import settings


@lru_cache(maxsize=1)
def get_storage_client() -> Minio:
    """Build singleton S3-compatible client (MinIO or AWS S3)."""
    if settings.storage_provider == "s3":
        return Minio(
            endpoint=f"s3.{settings.storage_region}.amazonaws.com",
            access_key=settings.storage_access_key,
            secret_key=settings.storage_secret_key,
            secure=True,
            region=settings.storage_region,
        )

    # Default: local MinIO
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


# Backward-compatible alias
get_minio_client = get_storage_client


def get_bucket_name() -> str:
    """Return configured upload bucket name."""
    if settings.storage_provider == "s3":
        return settings.storage_bucket
    return settings.minio_bucket_name


def ensure_bucket_exists(client: Minio, bucket_name: str) -> None:
    """Create bucket when missing to prevent NoSuchBucket at upload time.

    Skipped for AWS S3 — buckets should be pre-provisioned via IaC.
    """
    if settings.storage_provider == "s3":
        return

    if client.bucket_exists(bucket_name):
        return

    try:
        client.make_bucket(bucket_name)
    except S3Error as exc:
        # Another process may have created it between exists-check and create.
        if exc.code != "BucketAlreadyOwnedByYou":
            raise
