package com.chatly.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final JwtHandshakeHandler jwtHandshakeHandler;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue")
            .setHeartbeatValue(new long[]{10000, 10000}) // ping mỗi 10s
            .setTaskScheduler(heartbeatScheduler());
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS endpoint (cho browser production)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(webSocketAuthInterceptor)
                .setHandshakeHandler(jwtHandshakeHandler)
                .withSockJS();

        // Raw WebSocket endpoint (cho test / mobile)
        registry.addEndpoint("/ws-raw")
                .setAllowedOriginPatterns("*")
                .addInterceptors(webSocketAuthInterceptor)
                .setHandshakeHandler(jwtHandshakeHandler);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(8 * 1024 * 1024);
        registration.setSendBufferSizeLimit(4 * 1024 * 1024);
        registration.setSendTimeLimit(60000);
    }

    // Tăng thread pool để xử lý nhiều message STOMP đồng thời
    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor()
            .corePoolSize(8)
            .maxPoolSize(16)
            .queueCapacity(500);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor()
            .corePoolSize(8)
            .maxPoolSize(16)
            .queueCapacity(500);
    }
    
    @Bean
    public TaskScheduler heartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2); // 2 thread là đủ cho heartbeat
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }
}
