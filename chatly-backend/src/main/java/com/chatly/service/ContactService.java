package com.chatly.service;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.BlockStatusResponse;
import com.chatly.dto.response.ContactResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ContactMapper;
import com.chatly.model.enums.ContactStatus;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.postgres.Contact;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.model.mongo.UserSettings;
import com.chatly.repository.mongo.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final ContactMapper contactMapper;
    private final NotificationService notificationService;
    private final UserSettingsRepository userSettingsRepository;

    @Transactional
    public ContactResponse sendRequest(UUID userId, ContactRequest request) {
        UUID contactId = UUID.fromString(request.getContactId());

        if (userId.equals(contactId)) {
            throw new AppException(ErrorCode.CONTACT_SELF_REQUEST);
        }

        if (contactRepository.existsByUserIdAndContactId(userId, contactId)) {
            throw new AppException(ErrorCode.CONTACT_ALREADY_EXISTS);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User contact = userRepository.findById(contactId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Contact newContact = Contact.builder()
                .user(user)
                .contact(contact)
                .build();

        ContactResponse response = contactMapper.toResponse(contactRepository.save(newContact));

        notificationService.createAndPush(
                NotificationType.FRIEND_REQUEST,
                userId.toString(),
                contactId.toString(),
                user.getDisplayName() + " đã gửi cho bạn một lời mời kết bạn",
                userId.toString()
        );

        return response;
    }

    @Transactional
    public ContactResponse acceptRequest(UUID contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.ACCEPTED);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    @Transactional
    public ContactResponse blockContact(UUID contactRecordId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.BLOCKED);
        contact.setBlockedBy(currentUserId);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    @Transactional
    public ContactResponse unblockContact(UUID contactRecordId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        if (!currentUserId.equals(contact.getBlockedBy())) {
            throw new AppException(ErrorCode.CONTACT_NOT_AUTHORIZED);
        }

        contact.setStatus(ContactStatus.ACCEPTED);
        contact.setBlockedBy(null);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    @Transactional(readOnly = true)
    public BlockStatusResponse getBlockStatus(UUID currentUserId, UUID otherUserId) {
        Optional<Contact> opt = contactRepository.findByParticipants(currentUserId, otherUserId);

        if (opt.isEmpty() || opt.get().getStatus() != ContactStatus.BLOCKED) {
            return BlockStatusResponse.builder()
                    .blocked(false)
                    .blockedBy(null)
                    .direction(null)
                    .build();
        }

        Contact contact = opt.get();
        String direction = currentUserId.equals(contact.getBlockedBy()) ? "I_BLOCKED" : "BLOCKED_ME";

        return BlockStatusResponse.builder()
                .blocked(true)
                .blockedBy(contact.getBlockedBy() != null ? contact.getBlockedBy().toString() : null)
                .direction(direction)
                .build();
    }

    /**
     * Check if otherUserId has blocked requesterId (used by UserService for profile guard).
     */
    @Transactional(readOnly = true)
    public boolean isBlockedBy(UUID requesterId, UUID otherUserId) {
        Optional<Contact> opt = contactRepository.findByParticipants(requesterId, otherUserId);
        if (opt.isEmpty()) return false;
        Contact contact = opt.get();
        return contact.getStatus() == ContactStatus.BLOCKED
                && otherUserId.equals(contact.getBlockedBy());
    }

    /**
     * Check if any block relationship exists between two users (used by MessageService).
     */
    @Transactional(readOnly = true)
    public boolean isBlocked(UUID userA, UUID userB) {
        Optional<Contact> opt = contactRepository.findByParticipants(userA, userB);
        if (opt.isEmpty()) return false;
        return opt.get().getStatus() == ContactStatus.BLOCKED;
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> getContacts(UUID userId, ContactStatus status) {
        // For BLOCKED: only return records where this user issued the block,
        // so the victim does not see the record in their own block list.
        if (status == ContactStatus.BLOCKED) {
            return contactRepository.findBlockedByUser(userId).stream()
                    .map(contactMapper::toResponse)
                    .toList();
        }
        // For ACCEPTED: include contacts blocked by others (victim still sees blocker as friend),
        // but exclude contacts the current user has blocked themselves (those go to block list only).
        if (status == ContactStatus.ACCEPTED) {
            return contactRepository.findFriendsAndBlocked(userId).stream()
                    .map(contactMapper::toResponse)
                    .toList();
        }
        return contactRepository.findByParticipantIdAndStatus(userId, status).stream()
                .map(contactMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> getAllContacts(UUID userId) {
        return contactRepository.findByUserIdOrContactId(userId, userId).stream()
                .map(contactMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getFriendCount(UUID userId) {
        return contactRepository.countByParticipantIdAndStatus(userId, ContactStatus.ACCEPTED);
    }

    /**
     * Block a user by their userId. Finds (or creates) the contact record and marks it BLOCKED.
     * Idempotent: returns the existing record if already blocked by this user.
     */
    @Transactional
    public ContactResponse blockByUser(UUID targetUserId, UUID currentUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new AppException(ErrorCode.CONTACT_SELF_REQUEST);
        }
        Optional<Contact> existing = contactRepository.findByParticipants(currentUserId, targetUserId);
        Contact contact;
        if (existing.isPresent()) {
            contact = existing.get();
            if (ContactStatus.BLOCKED == contact.getStatus() && currentUserId.equals(contact.getBlockedBy())) {
                return contactMapper.toResponse(contact); // already blocked by this user
            }
        } else {
            User user = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            contact = Contact.builder()
                    .user(user)
                    .contact(target)
                    .build();
        }
        contact.setStatus(ContactStatus.BLOCKED);
        contact.setBlockedBy(currentUserId);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    /**
     * Unblock a user by their userId. Restores the contact record to ACCEPTED.
     * Only the user who issued the block may unblock.
     */
    @Transactional
    public ContactResponse unblockByUser(UUID targetUserId, UUID currentUserId) {
        Contact contact = contactRepository.findByParticipants(currentUserId, targetUserId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));
        if (!currentUserId.equals(contact.getBlockedBy())) {
            throw new AppException(ErrorCode.CONTACT_NOT_AUTHORIZED);
        }
        contact.setStatus(ContactStatus.ACCEPTED);
        contact.setBlockedBy(null);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    /**
     * Returns the contact record between current user and another user, or null if none.
     */
    @Transactional(readOnly = true)
    public ContactResponse getContactByUser(UUID currentUserId, UUID otherUserId) {
        return contactRepository.findByParticipants(currentUserId, otherUserId)
                .map(contactMapper::toResponse)
                .orElse(null);
    }

    @Transactional
    public void deleteContact(UUID contactRecordId) {
        if (!contactRepository.existsById(contactRecordId)) {
            throw new AppException(ErrorCode.CONTACT_NOT_FOUND);
        }
        contactRepository.deleteById(contactRecordId);
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> getFriendsForUser(UUID targetUserId, UUID currentUserId) {
        if (!targetUserId.equals(currentUserId)) {
            UserSettings settings = userSettingsRepository.findByUserId(targetUserId.toString())
                    .orElse(null);
            if (settings != null && settings.getPrivacy() != null 
                    && Boolean.FALSE.equals(settings.getPrivacy().getShowFriendList())) {
                throw new AppException(ErrorCode.FRIEND_LIST_HIDDEN);
            }
        }
        return contactRepository.findByParticipantIdAndStatus(targetUserId, ContactStatus.ACCEPTED).stream()
                .map(contactMapper::toResponse)
                .toList();
    }
}
