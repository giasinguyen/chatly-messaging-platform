package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Field;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    private String fileId;

    @Field("fileName")
    private String name;

    @Field("fileUrl")
    private String url;

    @Field("fileType")
    private String type;

    @Field("fileSize")
    private Long size;

    @Field("durationSeconds")
    private Integer durationSeconds;
}
