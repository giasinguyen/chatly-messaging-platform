package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditMessageRequest {

    @NotBlank(message = "INVALID_KEY")
    @Size(max = 10000, message = "INVALID_KEY")
    private String content;
}
