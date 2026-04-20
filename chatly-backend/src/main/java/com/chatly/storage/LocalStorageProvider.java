package com.chatly.storage;

import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageProvider implements StorageProvider {

    private final Path baseDir;
    private final String baseUrl;

    public LocalStorageProvider(
            @Value("${storage.local.upload-dir:./uploads}") String uploadDir,
            @Value("${storage.local.base-url:http://localhost:8080/uploads}") String baseUrl) {
        this.baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        log.info("LocalStorageProvider initialised — upload dir: {}, base URL: {}", this.baseDir, this.baseUrl);
    }

    @Override
    public UploadResult upload(MultipartFile file, String folder) {
        try {
            Path targetDir = baseDir.resolve(folder).normalize();
            Files.createDirectories(targetDir);

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String storedName = UUID.randomUUID() + extension;

            Path targetPath = targetDir.resolve(storedName);
            file.transferTo(targetPath);

            String storageKey = folder + "/" + storedName;
            String url = baseUrl + "/" + storageKey;

            log.debug("File saved: {}", targetPath);
            return new UploadResult(url, storageKey, "local");
        } catch (IOException e) {
            log.error("Failed to store file locally", e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path target = baseDir.resolve(storageKey).normalize();
            if (!target.startsWith(baseDir)) {
                log.warn("Attempted path traversal in delete, key: {}", storageKey);
                return;
            }
            Files.deleteIfExists(target);
            log.debug("File deleted: {}", target);
        } catch (IOException e) {
            log.warn("Failed to delete file: {}", storageKey, e);
        }
    }

    @Override
    public Resource download(String storageKey) {
        try {
            Path target = baseDir.resolve(storageKey).normalize();
            if (!target.startsWith(baseDir)) {
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            Resource resource = new UrlResource(target.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            return resource;
        } catch (MalformedURLException e) {
            log.error("Failed to read local file: {}", storageKey, e);
            throw new AppException(ErrorCode.FILE_NOT_FOUND);
        }
    }
}
