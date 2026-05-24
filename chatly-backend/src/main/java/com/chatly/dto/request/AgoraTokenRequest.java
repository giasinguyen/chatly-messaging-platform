package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgoraTokenRequest {

    @NotBlank(message = "INVALID_KEY")
    private String conversationId;

    @NotBlank(message = "INVALID_KEY")
    private String callId;
}
