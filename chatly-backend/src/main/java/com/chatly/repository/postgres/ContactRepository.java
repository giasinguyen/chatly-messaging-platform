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
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId OR c.contact.id = :userId) AND c.status = :status")
    List<Contact> findByParticipantIdAndStatus(@Param("userId") UUID userId, @Param("status") ContactStatus status);

    /**
     * Find a contact record between two users regardless of who initiated the request.
     */
    @Query("SELECT c FROM Contact c WHERE (c.user.id = :userId AND c.contact.id = :otherId) OR (c.user.id = :otherId AND c.contact.id = :userId)")
    Optional<Contact> findByParticipants(@Param("userId") UUID userId, @Param("otherId") UUID otherId);
}
