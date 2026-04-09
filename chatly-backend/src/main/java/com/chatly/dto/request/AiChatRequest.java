package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AiChatRequest {

    @NotBlank
    @Size(min = 1, max = 8192)
    private String message;

    private String agentType = "chatbot";

    private boolean useWebSearch = false;

    private List<String> mcpServerIds = List.of();
}
