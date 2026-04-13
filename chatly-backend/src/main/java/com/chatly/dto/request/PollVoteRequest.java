package com.chatly.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollVoteRequest {

    @NotNull(message = "Option index is required")
    private Integer optionIndex;
}
