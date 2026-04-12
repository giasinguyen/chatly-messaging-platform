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

    @Transactional
    public void deleteContact(UUID contactRecordId) {
        if (!contactRepository.existsById(contactRecordId)) {
            throw new AppException(ErrorCode.CONTACT_NOT_FOUND);
        }
        contactRepository.deleteById(contactRecordId);
    }
}
