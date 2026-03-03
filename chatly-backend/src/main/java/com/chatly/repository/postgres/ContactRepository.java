package com.chatly.repository.postgres;

import com.chatly.model.enums.ContactStatus;
import com.chatly.model.postgres.Contact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContactRepository extends JpaRepository<Contact, UUID> {

    List<Contact> findByUserIdAndStatus(UUID userId, ContactStatus status);

    List<Contact> findByUserIdOrContactId(UUID userId, UUID contactId);

    Optional<Contact> findByUserIdAndContactId(UUID userId, UUID contactId);

    boolean existsByUserIdAndContactId(UUID userId, UUID contactId);
}
