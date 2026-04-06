package com.chatly.repository.postgres;

import com.chatly.model.postgres.EmailVerificationOtp;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, UUID> {

    Optional<EmailVerificationOtp> findTopByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<EmailVerificationOtp> findTopByVerificationTokenAndUsedFalseOrderByCreatedAtDesc(String verificationToken);

    boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant createdAt);

    @Transactional
    @Modifying
    @Query("UPDATE EmailVerificationOtp e SET e.used = true WHERE e.userId = :userId AND e.used = false")
    int markAllUnusedAsUsed(@Param("userId") UUID userId);
}
