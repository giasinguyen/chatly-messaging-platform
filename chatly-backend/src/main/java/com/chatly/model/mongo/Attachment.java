package com.chatly.model.mongo;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
}
