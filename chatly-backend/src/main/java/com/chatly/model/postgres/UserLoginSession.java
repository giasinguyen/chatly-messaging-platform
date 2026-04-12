package com.chatly.model.postgres;

import com.chatly.model.enums.ClientPlatform;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "user_login_sessions",
    indexes = @Index(name = "idx_uls_user_platform_revoked", columnList = "user_id, platform, revoked")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserLoginSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ClientPlatform platform;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    private Instant revokedAt;

    /** Human-readable label, e.g. from X-Device-Label or shortened User-Agent */
    @Column(length = 512)
    private String deviceLabel;

    @Column(length = 1024)
    private String userAgent;

    @Column(length = 64)
    private String ipAddress;

    @Column(length = 256)
    private String locationLabel;

    @CreationTimestamp
    private Instant createdAt;

    private Instant lastSeenAt;
}
