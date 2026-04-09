package com.chatly.agent;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;

@Getter
public class AgentServiceException extends RuntimeException {

    private final HttpStatusCode statusCode;

    public AgentServiceException(HttpStatusCode statusCode, String body) {
        super("Agent error " + statusCode.value() + ": " + body);
        this.statusCode = statusCode;
    }
}
