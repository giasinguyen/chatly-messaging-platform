package com.chatly.proxy;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;

@Getter
public class AgentProxyException extends RuntimeException {

    private final HttpStatusCode agentStatusCode;

    public AgentProxyException(HttpStatusCode statusCode, String body) {
        super("Agent responded with " + statusCode + ": " + body);
        this.agentStatusCode = statusCode;
    }
}
