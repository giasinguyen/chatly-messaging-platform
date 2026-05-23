package com.chatly.service;

import com.chatly.dto.request.AdminCreateUserRequest;
import com.chatly.dto.request.AdminSettingsRequest;
import com.chatly.dto.response.AdminAuditLogResponse;
import com.chatly.dto.response.AdminSettingsResponse;
import com.chatly.dto.response.AdminStatsResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.MessageResponse;
import com.chatly.dto.response.NotificationResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.PostResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.AdminAuditLogMapper;
import com.chatly.mapper.AdminSettingsMapper;
import com.chatly.mapper.ConversationMapper;
import com.chatly.mapper.MessageMapper;
import com.chatly.mapper.NotificationMapper;
import com.chatly.mapper.PostMapper;
import com.chatly.mapper.UserMapper;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.enums.ReportStatus;
import com.chatly.model.enums.UserStatus;
import com.chatly.model.mongo.AdminAuditLog;
import com.chatly.model.mongo.AdminSettings;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.Message;
import com.chatly.model.mongo.Notification;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReport;
import com.chatly.model.mongo.PostReaction;
import com.chatly.model.postgres.User;
import com.chatly.proxy.AgentProxyClient;
import com.chatly.service.NotificationService;
import com.chatly.repository.mongo.AdminAuditLogRepository;
import com.chatly.repository.mongo.AdminSettingsRepository;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.PostReportRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private static final String GLOBAL_SETTINGS_ID = "global";

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final PostRepository postRepository;
    private final PostReportRepository postReportRepository;
    private final NotificationRepository notificationRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final AdminSettingsRepository adminSettingsRepository;
    private final UserMapper userMapper;
    private final PostMapper postMapper;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final NotificationMapper notificationMapper;
    private final AdminAuditLogMapper adminAuditLogMapper;
    private final AdminSettingsMapper adminSettingsMapper;
    private final AgentProxyClient agentProxyClient;
    private final RedisTemplate<String, String> redisTemplate;
    private final UserSessionService userSessionService;
    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

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
            var response = agentProxyClient.forward(HttpMethod.GET, "/health/", "system", null);
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
    public UserResponse createUser(String adminUserId, AdminCreateUserRequest request) {
        validateCreateUserRequest(request);

        Instant now = Instant.now();
        User user = User.builder()
                .username(request.getUsername().trim())
                .email(normalizeNullable(request.getEmail()))
                .phone(normalizeNullable(request.getPhone()))
                .displayName(request.getDisplayName().trim())
                .avatarUrl(normalizeNullable(request.getAvatarUrl()))
                .bio(normalizeNullable(request.getBio()))
                .dob(request.getDob())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(request.getEmail() != null && !request.getEmail().isBlank())
                .passwordChangedAt(now)
                .build();

        User saved = userRepository.save(user);
        logAudit(adminUserId, "USER_CREATED", "USER", saved.getId().toString(),
                "User created", "Admin created user @" + saved.getUsername());
        return userMapper.toResponse(saved);
    }

    public PagedResponse<UserResponse> listUsers(String keyword, String statusFilter, Pageable pageable) {
        boolean hasKeyword = !isBlank(keyword);
        String kw = hasKeyword ? keyword.trim() : null;
        Page<User> users;
        switch (statusFilter == null ? "ALL" : statusFilter.toUpperCase()) {
            case "SUSPENDED" ->
                users = hasKeyword
                        ? userRepository.searchSuspendedByKeyword(kw, pageable)
                        : userRepository.findBySuspendedTrue(pageable);
            case "ONLINE" ->
                users = hasKeyword
                        ? userRepository.searchByStatusAndKeyword(UserStatus.ONLINE, kw, pageable)
                        : userRepository.findBySuspendedFalseAndStatus(UserStatus.ONLINE, pageable);
            case "OFFLINE" ->
                users = hasKeyword
                        ? userRepository.searchOfflineByKeyword(UserStatus.ONLINE, kw, pageable)
                        : userRepository.findBySuspendedFalseAndStatusNot(UserStatus.ONLINE, pageable);
            default ->
                users = hasKeyword
                        ? userRepository.searchByKeyword(kw, pageable)
                        : userRepository.findAll(pageable);
        }
        return PagedResponse.from(users.map(userMapper::toResponse));
    }

    public UserResponse getUser(String id) {
        return userMapper.toResponse(findUser(id));
    }

    @Transactional
    public void suspendUser(String adminUserId, String id, boolean suspend) {
        User user = findUser(id);
        user.setSuspended(suspend);
        userRepository.saveAndFlush(user);

        if (suspend) {
            userSessionService.revokeAllForUser(user.getId());
            log.info("User {} suspended; all sessions revoked", id);
        } else {
            log.info("User {} unsuspended", id);
        }

        String action = suspend ? "USER_SUSPENDED" : "USER_RESTORED";
        logAudit(adminUserId, action, "USER", id,
                suspend ? "User suspended" : "User restored",
                "Admin updated suspension status for @" + user.getUsername());
    }

    public PagedResponse<PostResponse> listPosts(String keyword, String hashtag, Pageable pageable) {
        Query query = buildPostQuery(keyword, hashtag)
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> posts = findPage(query, pageable, Post.class);
        return PagedResponse.from(toPostResponsePage(posts));
    }

    public PostResponse getPost(String id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_FOUND));
        return toPostResponse(post, null);
    }

    @Transactional
    public void deletePost(String adminUserId, String id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_FOUND));
        String authorId = post.getAuthorId();
        postRepository.delete(post);
        logAudit(adminUserId, "POST_DELETED", "POST", id,
                "Post deleted", "Admin deleted a post by user " + authorId);
        if (authorId != null) {
            notificationService.createAndPush(
                    NotificationType.SYSTEM,
                    null,
                    authorId,
                    "Your post has been removed for violating our community guidelines.",
                    id);
        }
    }

    public PagedResponse<ConversationResponse> listConversations(
            ConversationType type, String keyword, Pageable pageable) {
        Page<Conversation> conversations = isBlank(keyword)
                ? findConversationsWithoutKeyword(type, pageable)
                : findConversationsWithKeyword(type, keyword, pageable);
        return PagedResponse.from(conversations.map(conversationMapper::toResponse));
    }

    public ConversationResponse getConversation(String id) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        return conversationMapper.toResponse(conversation);
    }

    @Transactional
    public void deleteConversation(String adminUserId, String id) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        conversationRepository.delete(conversation);
        logAudit(adminUserId, "CONVERSATION_DELETED", "CONVERSATION", id,
                "Conversation deleted", "Admin deleted conversation " + displayConversationName(conversation));
    }

    public PagedResponse<MessageResponse> listMessages(
            String conversationId, String senderId, String keyword, Pageable pageable) {
        Query query = buildMessageQuery(conversationId, senderId, keyword)
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Message> messages = findPage(query, pageable, Message.class);
        return PagedResponse.from(messages.map(messageMapper::toResponse));
    }

    public MessageResponse getMessage(String id) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));
        return messageMapper.toResponse(message);
    }

    @Transactional
    public void deleteMessage(String adminUserId, String id) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));
        messageRepository.delete(message);
        logAudit(adminUserId, "MESSAGE_DELETED", "MESSAGE", id,
                "Message deleted", "Admin deleted a message in conversation " + message.getConversationId());
    }

    public PagedResponse<NotificationResponse> listNotifications(
            NotificationType type, Boolean read, Pageable pageable) {
        Page<Notification> notifications;
        if (type != null && read != null) {
            notifications = notificationRepository
                    .findByTypeInAndReadOrderByCreatedAtDesc(List.of(type), read, pageable);
        } else if (type != null) {
            notifications = notificationRepository.findByTypeInOrderByCreatedAtDesc(List.of(type), pageable);
        } else if (read != null) {
            notifications = notificationRepository.findByReadOrderByCreatedAtDesc(read, pageable);
        } else {
            notifications = notificationRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return PagedResponse.from(toNotificationResponsePage(notifications));
    }

    public NotificationResponse getNotification(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        return toNotificationResponse(notification, null);
    }

    public PagedResponse<AdminAuditLogResponse> listAuditLogs(String type, Pageable pageable) {
        Page<AdminAuditLog> auditLogs = isBlank(type)
                ? adminAuditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                : adminAuditLogRepository.findByTypeOrderByCreatedAtDesc(type.trim(), pageable);
        return PagedResponse.from(auditLogs.map(adminAuditLogMapper::toResponse));
    }

    public AdminSettingsResponse getSettings() {
        return adminSettingsMapper.toResponse(getOrCreateSettings());
    }

    @Transactional
    public AdminSettingsResponse updateSettings(String adminUserId, AdminSettingsRequest request) {
        AdminSettings settings = getOrCreateSettings();
        applySettings(settings, request);
        AdminSettings saved = adminSettingsRepository.save(settings);
        logAudit(adminUserId, "SETTINGS_UPDATED", "SETTINGS", saved.getId(),
                "Settings updated", "Admin updated platform settings");
        return adminSettingsMapper.toResponse(saved);
    }

    private void validateCreateUserRequest(AdminCreateUserRequest request) {
        String email = normalizeNullable(request.getEmail());
        String phone = normalizeNullable(request.getPhone());

        if (email == null && phone == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }
        if (email != null && userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
        }
    }

    private User findUser(String id) {
        return userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private Query buildPostQuery(String keyword, String hashtag) {
        List<Criteria> criteria = new ArrayList<>();
        if (!isBlank(keyword)) {
            criteria.add(regexCriteria("content", keyword.trim()));
        }
        if (!isBlank(hashtag)) {
            criteria.add(Criteria.where("hashtags").is(normalizeHashtag(hashtag)));
        }
        return queryWithCriteria(criteria);
    }

    private Page<Conversation> findConversationsWithoutKeyword(ConversationType type, Pageable pageable) {
        if (type != null) {
            return conversationRepository.findByTypeOrderByUpdatedAtDesc(type, pageable);
        }
        return conversationRepository.findAllByOrderByUpdatedAtDesc(pageable);
    }

    private Page<Conversation> findConversationsWithKeyword(
            ConversationType type, String keyword, Pageable pageable) {
        List<Criteria> criteria = new ArrayList<>();
        if (type != null) {
            criteria.add(Criteria.where("type").is(type));
        }
        String normalizedKeyword = keyword.trim();
        criteria.add(new Criteria().orOperator(
                regexCriteria("name", normalizedKeyword),
                Criteria.where("_id").is(normalizedKeyword),
                Criteria.where("creatorId").is(normalizedKeyword),
                Criteria.where("participantIds").is(normalizedKeyword)));

        Query query = queryWithCriteria(criteria).with(Sort.by(Sort.Direction.DESC, "updatedAt"));
        return findPage(query, pageable, Conversation.class);
    }

    private Query buildMessageQuery(String conversationId, String senderId, String keyword) {
        List<Criteria> criteria = new ArrayList<>();
        if (!isBlank(conversationId)) {
            criteria.add(Criteria.where("conversationId").is(conversationId.trim()));
        }
        if (!isBlank(senderId)) {
            criteria.add(Criteria.where("senderId").is(senderId.trim()));
        }
        if (!isBlank(keyword)) {
            criteria.add(regexCriteria("content", keyword.trim()));
        }
        return queryWithCriteria(criteria);
    }

    private Query queryWithCriteria(List<Criteria> criteria) {
        Query query = new Query();
        if (criteria.isEmpty()) {
            return query;
        }
        query.addCriteria(new Criteria().andOperator(criteria.toArray(Criteria[]::new)));
        return query;
    }

    private Criteria regexCriteria(String field, String value) {
        return Criteria.where(field).regex(Pattern.compile(Pattern.quote(value), Pattern.CASE_INSENSITIVE));
    }

    private <T> Page<T> findPage(Query query, Pageable pageable, Class<T> entityType) {
        long total = mongoTemplate.count(query, entityType);
        List<T> items = mongoTemplate.find(Query.of(query).with(pageable), entityType);
        return new PageImpl<>(items, pageable, total);
    }

    private Page<PostResponse> toPostResponsePage(Page<Post> page) {
        Map<String, User> authors = loadUsersById(
                page.getContent().stream().map(Post::getAuthorId).distinct().toList());
        List<PostResponse> responses = page.getContent().stream()
                .map(post -> toPostResponse(post, authors.get(post.getAuthorId())))
                .toList();
        return new PageImpl<>(responses, page.getPageable(), page.getTotalElements());
    }

    private PostResponse toPostResponse(Post post, User author) {
        PostResponse response = postMapper.toResponse(post);
        response.setReactions(buildReactionSummary(post));
        response.setSavedByMe(false);
        if (author != null) {
            response.setAuthorUsername(author.getUsername());
            response.setAuthorDisplayName(author.getDisplayName());
            response.setAuthorAvatarUrl(author.getAvatarUrl());
        }
        return response;
    }

    private List<PostReactionSummary> buildReactionSummary(Post post) {
        Map<ReactionType, Long> counts = new EnumMap<>(ReactionType.class);
        for (PostReaction reaction : post.getReactions()) {
            counts.merge(reaction.getType(), 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .map(entry -> PostReactionSummary.builder()
                        .type(entry.getKey())
                        .count(entry.getValue())
                        .reactedByMe(false)
                        .build())
                .collect(Collectors.toList());
    }

    private Page<NotificationResponse> toNotificationResponsePage(Page<Notification> page) {
        Map<String, User> senders = loadUsersById(
                page.getContent().stream().map(Notification::getSenderId).distinct().toList());
        List<NotificationResponse> responses = page.getContent().stream()
                .map(notification -> toNotificationResponse(notification, senders.get(notification.getSenderId())))
                .toList();
        return new PageImpl<>(responses, page.getPageable(), page.getTotalElements());
    }

    private NotificationResponse toNotificationResponse(Notification notification, User sender) {
        NotificationResponse response = notificationMapper.toResponse(notification);
        if (sender != null) {
            response.setSenderName(sender.getDisplayName());
            response.setSenderAvatar(sender.getAvatarUrl());
        } else {
            safeUuid(notification.getSenderId())
                    .flatMap(userRepository::findById)
                    .ifPresent(user -> {
                        response.setSenderName(user.getDisplayName());
                        response.setSenderAvatar(user.getAvatarUrl());
                    });
        }
        return response;
    }

    private Map<String, User> loadUsersById(List<String> userIds) {
        List<UUID> uuids = userIds.stream()
                .map(this::safeUuid)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
        if (uuids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(uuids).stream()
                .collect(Collectors.toMap(user -> user.getId().toString(), user -> user));
    }

    private void applySettings(AdminSettings settings, AdminSettingsRequest request) {
        Optional.ofNullable(request.getPublicRegistrationEnabled()).ifPresent(settings::setPublicRegistrationEnabled);
        Optional.ofNullable(request.getUserReportsEnabled()).ifPresent(settings::setUserReportsEnabled);
        Optional.ofNullable(request.getAiProactiveRepliesEnabled()).ifPresent(settings::setAiProactiveRepliesEnabled);
        Optional.ofNullable(request.getMaintenanceBannerEnabled()).ifPresent(settings::setMaintenanceBannerEnabled);
        Optional.ofNullable(request.getSessionTimeoutDays()).ifPresent(settings::setSessionTimeoutDays);
        Optional.ofNullable(request.getMaxUploadSizeMb()).ifPresent(settings::setMaxUploadSizeMb);
        Optional.ofNullable(request.getMessageRetentionDays()).ifPresent(settings::setMessageRetentionDays);
        Optional.ofNullable(request.getRateLimitWindowSeconds()).ifPresent(settings::setRateLimitWindowSeconds);
    }

    private AdminSettings getOrCreateSettings() {
        return adminSettingsRepository.findById(GLOBAL_SETTINGS_ID)
                .orElseGet(() -> adminSettingsRepository.save(
                        AdminSettings.builder().id(GLOBAL_SETTINGS_ID).build()));
    }

    private void logAudit(
            String adminUserId,
            String type,
            String targetType,
            String targetId,
            String title,
            String description) {
        adminAuditLogRepository.save(AdminAuditLog.builder()
                .adminUserId(adminUserId)
                .type(type)
                .targetType(targetType)
                .targetId(targetId)
                .title(title)
                .description(description)
                .build());
    }

    private Optional<UUID> safeUuid(String value) {
        try {
            return value == null || value.isBlank()
                    ? Optional.empty()
                    : Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private String displayConversationName(Conversation conversation) {
        if (!isBlank(conversation.getName())) {
            return conversation.getName();
        }
        return conversation.getId();
    }

    private String normalizeNullable(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private String normalizeHashtag(String hashtag) {
        String normalized = hashtag.trim();
        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1);
        }
        return normalized.toLowerCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
