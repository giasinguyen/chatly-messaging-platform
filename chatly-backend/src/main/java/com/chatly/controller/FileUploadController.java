package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.FileUploadResponse;
import com.chatly.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * Upload a file for a conversation.
     *
     * with {@code multipart/form-data} body containing field {@code file}.</p>
     */
    @PostMapping("/upload")
    public ApiResponse<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conversationId", required = false) String conversationId) {

        String userId = getAuthenticatedUserId();
        FileUploadResponse response = fileUploadService.upload(file, conversationId, userId);

        return ApiResponse.<FileUploadResponse>builder()
                .result(response)
                .build();
    }

    /**
     * Delete a previously uploaded file (only the uploader can delete).
     */
    @DeleteMapping("/{fileId}")
    public ApiResponse<Void> delete(@PathVariable String fileId) {
        fileUploadService.delete(fileId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("File deleted successfully")
                .build();
    }

    /**
     * List all files uploaded to a conversation.
     * Optionally filter by type: "image", "video", "file" (documents/audio/other).
     */
    @GetMapping("/conversation/{conversationId}")
    public ApiResponse<List<FileUploadResponse>> getByConversation(
            @PathVariable String conversationId,
            @RequestParam(value = "type", required = false) String type) {
        List<FileUploadResponse> files = fileUploadService.getByConversation(conversationId, type);
        return ApiResponse.<List<FileUploadResponse>>builder()
                .result(files)
                .build();
    }

    /**
     * List all files uploaded by the authenticated user across all conversations.
     * Optionally filter by type: "image", "video", "file".
     */
    @GetMapping("/my")
    public ApiResponse<List<FileUploadResponse>> getMyFiles(
            @RequestParam(value = "type", required = false) String type) {
        String userId = getAuthenticatedUserId();
        List<FileUploadResponse> files = fileUploadService.getByUploadedUser(userId, type);
        return ApiResponse.<List<FileUploadResponse>>builder()
                .result(files)
                .build();
    }

    /**
     * Download / proxy a file by its fileId.
     * This avoids CORS issues when the file is stored on an external provider (e.g. S3).
     */
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable String fileId) {
        FileUploadService.FileDownloadResult result = fileUploadService.downloadFile(fileId);
        String contentType = result.metadata().getFileType() != null
                ? result.metadata().getFileType()
                : "application/octet-stream";
        String fileName = result.metadata().getFileName() != null
                ? result.metadata().getFileName()
                : "file";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(result.resource());
    }

    // -------------------------------------------------------------------------

    private String getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
