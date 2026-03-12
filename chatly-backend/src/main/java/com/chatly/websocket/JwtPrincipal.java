package com.chatly.websocket;

import java.security.Principal;

public record JwtPrincipal(String userId) implements Principal {

    @Override
    public String getName() {
        return userId;
    }
}
