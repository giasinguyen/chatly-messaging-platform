package com.chatly.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

import com.chatly.model.enums.QrLoginStatus;

@Entity
@Table(name = "qr_login_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrLoginToken {

    @Id
    @Column(nullable = false, updatable = false)
    private String token; // UUID as string

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QrLoginStatus status;

    private UUID userId;

    @Column(nullable = false)
    private Instant expiresAt;

    private String ipAddress;
    
    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String authResponseData; // Stores the JSON serialized AuthResponse

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
