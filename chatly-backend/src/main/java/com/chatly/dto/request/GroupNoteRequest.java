package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupNoteRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String content;

    private Boolean pinned;
}
