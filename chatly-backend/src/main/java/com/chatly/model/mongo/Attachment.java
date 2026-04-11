package com.chatly.model.mongo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    private String fileId;

    @JsonProperty("name")
    private String fileName;

    @JsonProperty("url")
    private String fileUrl;

    @JsonProperty("type")
    private String fileType;

    @JsonProperty("size")
    private Long fileSize;
}
