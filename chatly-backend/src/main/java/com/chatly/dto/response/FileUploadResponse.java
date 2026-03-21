package com.chatly.dto.response;

import lombok.*;

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
}
