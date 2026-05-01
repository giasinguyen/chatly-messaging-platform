package com.chatly.repository.postgres;

import com.chatly.model.enums.ContactStatus;
import com.chatly.model.postgres.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContactRepository extends JpaRepository<Contact, UUID> {

    List<Contact> findByUserIdAndStatus(UUID userId, ContactStatus status);

    List<Contact> findByUserIdOrContactId(UUID userId, UUID contactId);

    Optional<Contact> findByUserIdAndContactId(UUID userId, UUID contactId);

    boolean existsByUserIdAndContactId(UUID userId, UUID contactId);

    /**
     * Find all contact records where the given user is either sender or receiver,
     * filtered by status. This ensures both parties can see the relationship.
     * NOTE: Do NOT use this for BLOCKED status — use findBlockedByUser instead to avoid
     * the victim of a block seeing the record in their own BLOCKED list.
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) AND c.status = :status")
    List<Contact> findByParticipantIdAndStatus(@Param("userId") UUID userId, @Param("status") ContactStatus status);

    /**
     * Returns only the contact records that the given user explicitly blocked
     * (i.e. blockedBy = userId). This prevents the other party from seeing
     * the block record in their own BLOCKED list.
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) AND c.status = 'BLOCKED' AND c.blockedBy = :userId")
    List<Contact> findBlockedByUser(@Param("userId") UUID userId);

    /**
     * Returns ACCEPTED contacts plus BLOCKED contacts where the current user is NOT the blocker.
     * This ensures the blocker only sees the blocked user in their block list (not friends list),
     * while the victim still sees the blocker in their own friends list (as a limited contact).
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) AND (c.status = 'ACCEPTED' OR (c.status = 'BLOCKED' AND c.blockedBy <> :userId))")
    List<Contact> findFriendsAndBlocked(@Param("userId") UUID userId);

    /**
     * Find a contact record between two users regardless of who initiated the request.
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId AND c.contact.id = :otherId) OR (c.user.id = :otherId AND c.contact.id = :userId)")
    Optional<Contact> findByParticipants(@Param("userId") UUID userId, @Param("otherId") UUID otherId);

        /**
         * Skeleton follow graph: returns IDs of accepted contacts for both directions.
         * If userId is sender, return contact.id; if userId is receiver, return user.id.
         * Replace with the real follow table query when the follow system is merged.
         */
        @Query("SELECT CASE WHEN c.user.id = :userId THEN CAST(c.contact.id AS string) "
            + "ELSE CAST(c.user.id AS string) END "
            + "FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) "
            + "AND c.status = 'ACCEPTED'")
    List<String> findFollowingIds(@Param("userId") UUID userId);

    /**
     * Returns String IDs of all users that {@code userId} has explicitly blocked.
     * Used by FeedService to exclude blocked authors from the feed.
     */
        @Query("SELECT CASE WHEN c.user.id = :userId THEN CAST(c.contact.id AS string) "
            + "ELSE CAST(c.user.id AS string) END "
            + "FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) "
            + "AND c.status = 'BLOCKED' AND c.blockedBy = :userId")
    List<String> findBlockedUserIds(@Param("userId") UUID userId);
}
