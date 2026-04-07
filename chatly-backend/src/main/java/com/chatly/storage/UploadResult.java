package com.chatly.storage;

/**
 * Immutable result returned by {@link StorageProvider#upload}.
 */
public record UploadResult(
        /** Public URL to access the file. */
        String url,
        /** Provider-specific key used to delete the file later. */
        String storageKey,
        /** Name of the storage provider (e.g. "local", "s3"). */
        String provider
) {}
