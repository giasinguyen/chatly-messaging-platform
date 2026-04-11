package com.chatly.service;

import com.chatly.dto.response.FileUploadResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.mongo.FileMetadata;
import com.chatly.repository.mongo.FileMetadataRepository;
import com.chatly.storage.StorageProvider;
import com.chatly.storage.UploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            "video/mp4", "video/webm", "video/quicktime",
            "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "application/zip"
    );

    @Value("${storage.max-file-size-mb:20}")
    private long maxFileSizeMb;

    private final StorageProvider storageProvider;
    private final FileMetadataRepository fileMetadataRepository;

    public FileUploadResponse upload(MultipartFile file, String conversationId, String uploadedBy) {
        validateFile(file);

        String folder = resolveFolder(file.getContentType());
        UploadResult result = storageProvider.upload(file, folder);

        FileMetadata metadata = FileMetadata.builder()
                .provider(result.provider())
                .storageKey(result.storageKey())
                .url(result.url())
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .uploadedBy(uploadedBy)
                .conversationId(conversationId)
                .build();

        metadata = fileMetadataRepository.save(metadata);
        log.debug("FileMetadata saved: id={}, provider={}", metadata.getId(), metadata.getProvider());

        return FileUploadResponse.builder()
                .fileId(metadata.getId())
                .provider(metadata.getProvider())
                .url(metadata.getUrl())
                .fileName(metadata.getFileName())
                .fileType(metadata.getFileType())
                .fileSize(metadata.getFileSize())
                .conversationId(conversationId)
                .build();
    }

    public void delete(String fileId, String requesterId) {
        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new AppException(ErrorCode.FILE_NOT_FOUND));

        if (!metadata.getUploadedBy().equals(requesterId)) {
            throw new AppException(ErrorCode.FILE_DELETE_DENIED);
        }

        storageProvider.delete(metadata.getStorageKey());
        fileMetadataRepository.delete(metadata);
        log.debug("FileMetadata deleted: id={}", fileId);
    }

    public List<FileUploadResponse> getByConversation(String conversationId, String type) {
        List<FileMetadata> files = fileMetadataRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);

        if (type != null && !type.isBlank()) {
            files = files.stream().filter(f -> {
                String ft = f.getFileType();
                if (ft == null) return false;
                return switch (type.toLowerCase()) {
                    case "image" -> ft.startsWith("image/");
                    case "video" -> ft.startsWith("video/");
                    case "file" -> !ft.startsWith("image/") && !ft.startsWith("video/");
                    default -> true;
                };
            }).toList();
        }

        return files.stream().map(m -> FileUploadResponse.builder()
                .fileId(m.getId())
                .provider(m.getProvider())
                .url(m.getUrl())
                .fileName(m.getFileName())
                .fileType(m.getFileType())
                .fileSize(m.getFileSize())
                .conversationId(m.getConversationId())
                .createdAt(m.getCreatedAt())
                .build()
        ).toList();
    }

    public List<FileUploadResponse> getByUploadedUser(String userId, String type) {
        List<FileMetadata> files = fileMetadataRepository.findByUploadedBy(userId)
                .stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .toList();

        if (type != null && !type.isBlank()) {
            files = files.stream().filter(f -> {
                String ft = f.getFileType();
                if (ft == null) return false;
                return switch (type.toLowerCase()) {
                    case "image" -> ft.startsWith("image/");
                    case "video" -> ft.startsWith("video/");
                    case "file" -> !ft.startsWith("image/") && !ft.startsWith("video/");
                    default -> true;
                };
            }).toList();
        }

        return files.stream().map(m -> FileUploadResponse.builder()
                .fileId(m.getId())
                .provider(m.getProvider())
                .url(m.getUrl())
                .fileName(m.getFileName())
                .fileType(m.getFileType())
                .fileSize(m.getFileSize())
                .conversationId(m.getConversationId())
                .createdAt(m.getCreatedAt())
                .build()
        ).toList();
    }

    // -------------------------------------------------------------------------

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        long maxBytes = maxFileSizeMb * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new AppException(ErrorCode.FILE_SIZE_EXCEEDED);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
    }

    private static String resolveFolder(String contentType) {
        if (contentType == null) return "misc";
        if (contentType.startsWith("image/")) return "images";
        if (contentType.startsWith("video/")) return "videos";
        if (contentType.startsWith("audio/")) return "audio";
        return "documents";
    }
}
