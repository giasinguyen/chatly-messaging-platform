package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadResponse {

    private String fileId;
    private String provider;
    private String url;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String conversationId;
    private String uploadSource;
    private Instant createdAt;
}
