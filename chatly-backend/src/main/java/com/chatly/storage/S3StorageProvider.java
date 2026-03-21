package com.chatly.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stub AWS S3 storage provider.
 * This class is intentionally left as a skeleton so the project compiles and can be
 * switched to S3 via {@code storage.provider=s3} in {@code application.yml} without
 * touching any other code.  Replace the body of {@link #upload} and {@link #delete}
 * with real AWS SDK v2 calls when you are ready to deploy to S3.
 *
 * storage.s3.bucket=my-bucket
 * storage.s3.region=ap-southeast-1
 * storage.s3.access-key=AKIAXXXXXXXX
 * storage.s3.secret-key=xxxxxxxxxxxxxxxx
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3")
public class S3StorageProvider implements StorageProvider {

    // TODO: inject from @Value("${storage.s3.bucket}") etc. when implementing
    // TODO: construct software.amazon.awssdk.services.s3.S3Client using StaticCredentialsProvider

    @Override
    public UploadResult upload(MultipartFile file, String folder) {
        // TODO: use S3Client.putObject() with a PutObjectRequest
        // TODO: return new UploadResult("https://bucket.s3.region.amazonaws.com/key", "folder/key", "s3")
        throw new UnsupportedOperationException("S3StorageProvider is not yet implemented");
    }

    @Override
    public void delete(String storageKey) {
        // TODO: use S3Client.deleteObject() with a DeleteObjectRequest
        throw new UnsupportedOperationException("S3StorageProvider is not yet implemented");
    }
}
