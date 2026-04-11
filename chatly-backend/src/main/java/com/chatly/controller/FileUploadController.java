package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.FileUploadResponse;
import com.chatly.service.FileUploadService;
import lombok.RequiredArgsConstructor;
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

    // -------------------------------------------------------------------------

    private String getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
