package com.chatly.repository.postgres;

import com.chatly.model.postgres.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByUsername(String username);

    /**
     * Login lookup: username and phone match as stored; email is case-insensitive (must match forgot-password / mail).
     */
    @Query("""
        SELECT u FROM User u
        WHERE u.username = :identifier
           OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER(:identifier))
           OR (u.phone IS NOT NULL AND u.phone = :identifier)
        """)
    Optional<User> findByLoginIdentifier(@Param("identifier") String identifier);

        @Query("""
            SELECT u
            FROM User u
            WHERE LOWER(COALESCE(u.displayName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
        Page<User> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

        @Query("""
            SELECT u.id
            FROM User u
            WHERE LOWER(COALESCE(u.displayName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
        List<UUID> searchIdsByKeyword(@Param("keyword") String keyword);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByUsername(String username);

    /**
     * Return all users who were seen after the given threshold,
     * used by DailyBriefingScheduler to identify active users.
     */
    @Query("SELECT u FROM User u WHERE u.lastSeen >= :since")
    List<User> findActiveUsersSince(@Param("since") java.time.Instant since);
}
