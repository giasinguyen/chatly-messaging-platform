package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class AiMcpServerRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String url;

    private Map<String, String> headers = Map.of();
}
