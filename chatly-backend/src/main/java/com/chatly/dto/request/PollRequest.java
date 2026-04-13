package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollRequest {

    @NotBlank(message = "Question is required")
    private String question;

    @NotEmpty(message = "At least 2 options are required")
    @Size(min = 2, max = 10, message = "Options must be between 2 and 10")
    private List<String> options;

    private boolean multipleChoice;
}
