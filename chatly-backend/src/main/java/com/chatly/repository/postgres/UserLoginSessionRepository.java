package com.chatly.repository.postgres;

import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.postgres.UserLoginSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLoginSessionRepository extends JpaRepository<UserLoginSession, UUID> {

    List<UserLoginSession> findByUserIdAndRevokedFalseOrderByCreatedAtDesc(UUID userId);

    Optional<UserLoginSession> findByIdAndUserId(UUID id, UUID userId);

    List<UserLoginSession> findByUserIdAndPlatformAndRevokedFalse(UUID userId, ClientPlatform platform);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE UserLoginSession s SET s.revoked = true, s.revokedAt = :now WHERE s.userId = :userId AND s.revoked = false")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") java.time.Instant now);
}
