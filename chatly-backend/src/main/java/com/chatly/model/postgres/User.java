package com.chatly.model.postgres;

import com.chatly.model.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String displayName;

    private String avatarUrl;

    @Column(unique = true)
    private String phone;

    private Instant dob;

    private String bio;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatus status = UserStatus.OFFLINE;

    private Instant lastSeen;

    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private boolean suspended = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_device_tokens", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "token")
    @Builder.Default
    private Set<String> deviceTokens = new HashSet<>();

    /**
     * When the password was last set. JWTs issued before this instant are invalid.
     * Null for legacy rows; validation falls back to {@link #createdAt}.
     */
    private Instant passwordChangedAt;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    private void validateEmailOrPhone() {
        if (!isEmailOrPhoneProvided()) {
            throw new IllegalStateException("Either email or phone must be provided");
        }
    }

    @AssertTrue(message = "Either email or phone must be provided")
    private boolean isEmailOrPhoneProvided() {
        return (email != null && !email.isBlank()) || (phone != null && !phone.isBlank());
    }
}
