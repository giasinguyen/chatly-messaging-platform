package com.chatly.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.support.ChannelInterceptor;

@Configuration
public class WebSocketSecurityConfig {

    // Tắt CSRF cho STOMP WebSocket (auth đã xử lý ở HandshakeInterceptor)
    @Bean("csrfChannelInterceptor")
    public ChannelInterceptor csrfChannelInterceptor() {
        return new ChannelInterceptor() {};
    }
}
