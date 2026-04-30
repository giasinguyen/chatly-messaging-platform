package com.chatly;

import io.micrometer.context.ContextRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Hooks;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.chatly.ai.mcp.ConversationTools;
import com.chatly.ai.mcp.GroupTools;
import com.chatly.ai.mcp.MessageTools;
import com.chatly.ai.mcp.PollTools;
import com.chatly.ai.mcp.ReminderTools;
import com.chatly.ai.mcp.UserTools;

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
    public MethodToolCallbackProvider chatlyMcpToolCallbacks(
            UserTools userTools,
            ConversationTools conversationTools,
            MessageTools messageTools,
            GroupTools groupTools,
            ReminderTools reminderTools,
            PollTools pollTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(userTools, conversationTools, messageTools, groupTools, reminderTools, pollTools)
                .build();
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
