package com.chatly;

import io.micrometer.context.ContextRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import reactor.core.publisher.Hooks;

import com.chatly.ai.mcp.ChatlyMcpTools;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ChatlyBackendApplication {

    public static void main(String[] args) {
        // Propagate SecurityContext (and all other registered ThreadLocalAccessors)
        // automatically across Reactor scheduler thread switches — required so that
        // McpAsyncServer's boundedElastic execution can read SecurityContextHolder.
        Hooks.enableAutomaticContextPropagation();
        // ObservationThreadLocalAccessor causes scope mismatch WARNs when Reactor
        // restores Micrometer observation state on a different thread. Remove it so
        // only SecurityContext (and SLF4J MDC) are propagated across thread switches.
        ContextRegistry.getInstance().removeThreadLocalAccessor(ObservationThreadLocalAccessor.KEY);
        SpringApplication.run(ChatlyBackendApplication.class, args);
    }

    @Bean
    public MethodToolCallbackProvider chatlyMcpToolCallbacks(ChatlyMcpTools tools) {
        return MethodToolCallbackProvider.builder().toolObjects(tools).build();
    }

}

