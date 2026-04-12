package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TagPriorityRequest {

    @NotBlank(message = "INVALID_KEY")
    private String priority; // IMPORTANT or URGENT
}
