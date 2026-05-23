package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StartChatFromPostRequest {

    @NotBlank(message = "postId is required")
    private String postId;
}
