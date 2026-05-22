package com.chatly.service;

import com.chatly.dto.response.AdminStatsResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.ReportStatus;
import com.chatly.model.enums.UserStatus;
import com.chatly.model.postgres.User;
import com.chatly.model.mongo.PostReport;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.PostReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.chatly.proxy.AgentProxyClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpMethod;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final PostRepository postRepository;
    private final PostReportRepository postReportRepository;
    private final AgentProxyClient agentProxyClient;
    private final RedisTemplate<String, String> redisTemplate;
    private final UserSessionService userSessionService;

    public AdminStatsResponse getStats() {
        long totalUsers = userRepository.count();

        // Active users: those with lastSeen in last 24h (real data, no fake fallback)
        Instant activeSince = Instant.now().minus(24, ChronoUnit.HOURS);
        long activeUsers = userRepository.findActiveUsersSince(activeSince).size();

        // Online users: users with status = ONLINE
        long onlineUsers = userRepository.countByStatus(UserStatus.ONLINE);

        long totalConversations = conversationRepository.count();
        long totalMessages = messageRepository.count();
        long totalPosts = postRepository.count();

        // Today's new users
        Instant startOfToday = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
        long todayNewUsers = userRepository.countByCreatedAtAfter(startOfToday);

        // Pending reports count
        long pendingReports = postReportRepository.countByStatus(ReportStatus.PENDING);

        // Total groups (conversations with type GROUP)
        long totalGroups = conversationRepository.countByType(ConversationType.GROUP);

        // 1. User growth (cumulative count over last 7 days)
        List<AdminStatsResponse.UserGrowthData> userGrowth = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Instant endOfDay = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            long count = userRepository.countByCreatedAtBefore(endOfDay);

            userGrowth.add(AdminStatsResponse.UserGrowthData.builder()
                    .date(date.format(formatter))
                    .count(count)
                    .build());
        }

        // 2. Message activity (messages per day over last 7 days)
        List<AdminStatsResponse.MessageActivityData> messageActivity = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant dayEnd = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            long count = messageRepository.countByCreatedAtBetween(dayStart, dayEnd);

            messageActivity.add(AdminStatsResponse.MessageActivityData.builder()
                    .date(date.format(formatter))
                    .count(count)
                    .build());
        }

        // 3. System health (real checks — no fabricated percentages)
        List<AdminStatsResponse.SystemHealthStatus> systemHealth = new ArrayList<>();

        // 3.1 Core API Server — if we reached here, it is up
        systemHealth.add(AdminStatsResponse.SystemHealthStatus.builder()
                .service("Spring Boot API")
                .status("UP")
                .description("Main application server")
                .build());

        // 3.2 Relational Database (PostgreSQL)
        boolean dbUp = false;
        try {
            userRepository.count();
            dbUp = true;
        } catch (Exception e) {
            log.error("PostgreSQL health check failed", e);
        }
        systemHealth.add(AdminStatsResponse.SystemHealthStatus.builder()
                .service("PostgreSQL")
                .status(dbUp ? "UP" : "DOWN")
                .description("Relational database for users, contacts, sessions")
                .build());

        // 3.3 Document Store (MongoDB)
        boolean mongoUp = false;
        try {
            conversationRepository.count();
            mongoUp = true;
        } catch (Exception e) {
            log.error("MongoDB health check failed", e);
        }
        systemHealth.add(AdminStatsResponse.SystemHealthStatus.builder()
                .service("MongoDB")
                .status(mongoUp ? "UP" : "DOWN")
                .description("Document store for messages, conversations, posts")
                .build());

        // 3.4 Cache & Session Store (Redis)
        boolean redisUp = false;
        try {
            if (redisTemplate.getConnectionFactory() != null) {
                var conn = redisTemplate.getConnectionFactory().getConnection();
                conn.ping();
                redisUp = true;
            }
        } catch (Exception e) {
            log.error("Redis health check failed", e);
        }
        systemHealth.add(AdminStatsResponse.SystemHealthStatus.builder()
                .service("Redis")
                .status(redisUp ? "UP" : "DOWN")
                .description("Cache, token blacklist, session store")
                .build());

        // 3.5 AI Chatbot Agent
        boolean agentUp = false;
        try {
            var response = agentProxyClient.forward(HttpMethod.GET, "/health", "system", null);
            if (response != null && response.getStatusCode().is2xxSuccessful()) {
                agentUp = true;
            }
        } catch (Exception e) {
            log.warn("Agent health check failed: {}", e.getMessage());
        }
        systemHealth.add(AdminStatsResponse.SystemHealthStatus.builder()
                .service("AI Agent (LangGraph)")
                .status(agentUp ? "UP" : "DOWN")
                .description("Python AI chatbot service")
                .build());

        // 4. Recent activity log (signups and reports)
        List<AdminStatsResponse.AdminActivityLog> recentActivity = new ArrayList<>();

        List<User> recentUsers = userRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        for (User u : recentUsers) {
            recentActivity.add(AdminStatsResponse.AdminActivityLog.builder()
                    .id(u.getId().toString())
                    .type("USER_SIGNUP")
                    .title("New user registered")
                    .description("User @" + u.getUsername() + " joined the platform.")
                    .timestamp(u.getCreatedAt() != null ? u.getCreatedAt() : Instant.now())
                    .build());
        }

        List<PostReport> recentReports = postReportRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5)).getContent();
        for (PostReport r : recentReports) {
            recentActivity.add(AdminStatsResponse.AdminActivityLog.builder()
                    .id(r.getId())
                    .type("REPORT_CREATED")
                    .title("Content reported")
                    .description("Post reported for: " + r.getReason())
                    .timestamp(r.getCreatedAt() != null ? r.getCreatedAt() : Instant.now())
                    .build());
        }

        recentActivity.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        if (recentActivity.size() > 8) {
            recentActivity = recentActivity.subList(0, 8);
        }

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .onlineUsers(onlineUsers)
                .totalConversations(totalConversations)
                .totalMessages(totalMessages)
                .totalPosts(totalPosts)
                .totalGroups(totalGroups)
                .todayNewUsers(todayNewUsers)
                .pendingReports(pendingReports)
                .userGrowth(userGrowth)
                .messageActivity(messageActivity)
                .systemHealth(systemHealth)
                .recentActivity(recentActivity)
                .build();
    }

    @Transactional
    public void suspendUser(String id, boolean suspend) {
        User user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setSuspended(suspend);
        userRepository.save(user);

        // Revoke all active sessions when suspending so user is kicked out immediately
        if (suspend) {
            userSessionService.revokeAllForUser(user.getId());
            log.info("User {} suspended — all sessions revoked", id);
        } else {
            log.info("User {} unsuspended", id);
        }
    }
}
