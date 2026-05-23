package com.chatly.dto.request;

import com.chatly.model.enums.PostVisibility;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpdatePostRequest {

    @Size(max = 2000, message = "Content must not exceed 2000 characters")
    private String content;

    private List<String> mediaUrls;

    private PostVisibility visibility;

    private List<String> mentionIds;
}
