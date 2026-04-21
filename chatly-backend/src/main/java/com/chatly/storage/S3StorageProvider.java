package com.chatly.storage;

import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3")
public class S3StorageProvider implements StorageProvider {

    private final S3Client s3Client;
    private final String bucket;
    private final String region;

    public S3StorageProvider(
            @Value("${storage.s3.bucket}") String bucket,
            @Value("${storage.s3.region}") String region,
            @Value("${storage.s3.access-key}") String accessKey,
            @Value("${storage.s3.secret-key}") String secretKey) {
        this.bucket = bucket;
        this.region = region;
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        log.info("S3StorageProvider initialised — bucket: {}, region: {}", bucket, region);
    }

    @Override
    public UploadResult upload(MultipartFile file, String folder) {
        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String key = folder + "/" + UUID.randomUUID() + extension;

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String url = "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
            log.debug("Uploaded to S3: {}", url);
            return new UploadResult(url, key, "s3");
        } catch (IOException e) {
            log.error("Failed to upload file to S3", e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    @Override
    public void delete(String storageKey) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(storageKey)
                .build();
        s3Client.deleteObject(request);
        log.debug("Deleted from S3: {}", storageKey);
    }

    @Override
    public Resource download(String storageKey) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(storageKey)
                    .build();
            ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(request);
            return new InputStreamResource(stream);
        } catch (Exception e) {
            log.error("Failed to download from S3: {}", storageKey, e);
            throw new AppException(ErrorCode.FILE_NOT_FOUND);
        }
    }
}
