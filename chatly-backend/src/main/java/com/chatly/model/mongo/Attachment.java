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

    private String kind;

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

    @Field("postId")
    private String postId;

    @Field("postTitle")
    private String postTitle;

    @Field("postExcerpt")
    private String postExcerpt;

    @Field("postImageUrl")
    private String postImageUrl;

    @Field("postAuthorName")
    private String postAuthorName;

    @Field("postAuthorAvatarUrl")
    private String postAuthorAvatarUrl;

    @Field("targetUrl")
    private String targetUrl;

    @Field("storyId")
    private String storyId;

    @Field("storyType")
    private String storyType;

    @Field("storyMediaUrl")
    private String storyMediaUrl;

    @Field("storyContent")
    private String storyContent;

    @Field("storyOwnerName")
    private String storyOwnerName;

    @Field("storyOwnerAvatarUrl")
    private String storyOwnerAvatarUrl;
}
