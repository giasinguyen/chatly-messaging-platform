package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForwardMessageRequest {

    @NotBlank(message = "INVALID_KEY")
    private String messageId;

    @NotEmpty(message = "INVALID_KEY")
    private List<@NotBlank(message = "INVALID_KEY") String> targetConversationIds;
}