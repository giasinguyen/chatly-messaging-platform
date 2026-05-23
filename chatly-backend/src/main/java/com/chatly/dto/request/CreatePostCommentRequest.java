package com.chatly.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class CreatePostCommentRequest {

    @Size(max = 1000, message = "Comment content must not exceed 1000 characters")
    private String content;

    @Size(max = 10, message = "A comment can include up to 10 media items")
    private List<String> mediaUrls = new ArrayList<>();

    @Size(max = 20, message = "A comment can include up to 20 mentions")
    private List<String> mentionIds = new ArrayList<>();

    private String parentCommentId;
}
