package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryReplyRequest {

    @NotBlank(message = "INVALID_KEY")
    @Size(max = 500, message = "INVALID_KEY")
    private String content;
}
