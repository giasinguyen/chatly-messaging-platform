package com.chatly.service;

import com.chatly.mapper.AdminAuditLogMapper;
import com.chatly.mapper.AdminSettingsMapper;
import com.chatly.mapper.ConversationMapper;
import com.chatly.mapper.MessageMapper;
import com.chatly.mapper.NotificationMapper;
import com.chatly.mapper.PostMapper;
import com.chatly.mapper.UserMapper;
import com.chatly.model.mongo.AdminAuditLog;
import com.chatly.model.postgres.User;
import com.chatly.proxy.AgentProxyClient;
import com.chatly.repository.mongo.AdminAuditLogRepository;
import com.chatly.repository.mongo.AdminSettingsRepository;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.repository.mongo.PostReportRepository;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostReportRepository postReportRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private AdminAuditLogRepository adminAuditLogRepository;

    @Mock
    private AdminSettingsRepository adminSettingsRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PostMapper postMapper;

    @Mock
    private ConversationMapper conversationMapper;

    @Mock
    private MessageMapper messageMapper;

    @Mock
    private NotificationMapper notificationMapper;

    @Mock
    private AdminAuditLogMapper adminAuditLogMapper;

    @Mock
    private AdminSettingsMapper adminSettingsMapper;

    @Mock
    private AgentProxyClient agentProxyClient;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private UserSessionService userSessionService;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void suspendUser_withSuspendTrue_shouldPersistStatusRevokeSessionsAndAudit() {
        UUID adminId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .username("alice")
                .email("alice@example.com")
                .displayName("Alice")
                .password("hash")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        adminService.suspendUser(adminId.toString(), userId.toString(), true);

        assertThat(user.isSuspended()).isTrue();
        verify(userRepository).saveAndFlush(user);
        verify(userSessionService).revokeAllForUser(userId);
        verify(adminAuditLogRepository).save(argThat((AdminAuditLog log) ->
                "USER_SUSPENDED".equals(log.getType())
                        && userId.toString().equals(log.getTargetId())
                        && adminId.toString().equals(log.getAdminUserId())));
    }
}
