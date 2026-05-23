package com.chatly.dto.request;

import com.chatly.model.enums.PostVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreatePostRequest {

    @NotBlank(message = "Content is required")
    @Size(max = 2000, message = "Content must not exceed 2000 characters")
    private String content;

    private List<String> mediaUrls;

    @Size(max = 20, message = "A post can include up to 20 mentions")
    private List<String> mentionIds;

    private PostVisibility visibility = PostVisibility.PUBLIC;
}
