package com.chatly.service;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.BlockStatusResponse;
import com.chatly.dto.response.ContactResponse;
import com.chatly.dto.response.ContactSuggestionResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ContactMapper;
import com.chatly.mapper.ContactSuggestionMapper;
import com.chatly.model.enums.ContactStatus;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.postgres.Contact;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ContactService {

    private static final int DEFAULT_SUGGESTION_LIMIT = 5;
    private static final int MIN_SUGGESTION_LIMIT = 1;
    private static final int MAX_SUGGESTION_LIMIT = 20;

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final ContactMapper contactMapper;
    private final ContactSuggestionMapper contactSuggestionMapper;
    private final NotificationService notificationService;
    private final UserSettingsService userSettingsService;

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
        if (!userSettingsService.isFriendRequestAllowed(contactId.toString())) {
            throw new AppException(ErrorCode.CONTACT_FRIEND_REQUESTS_DISABLED);
        }

        Contact newContact = Contact.builder()
                .user(user)
                .contact(contact)
                .build();

        ContactResponse response = toContactResponse(contactRepository.save(newContact));

        notificationService.createAndPush(
                NotificationType.FRIEND_REQUEST,
                userId.toString(),
                contactId.toString(),
                user.getDisplayName() + " sent you a friend request",
                userId.toString()
        );

        return response;
    }

    @Transactional
    public ContactResponse acceptRequest(UUID contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.ACCEPTED);
        Contact acceptedContact = contactRepository.save(contact);
        notificationService.createAndPush(
                NotificationType.FRIEND_ACCEPTED,
                acceptedContact.getContact().getId().toString(),
                acceptedContact.getUser().getId().toString(),
                acceptedContact.getContact().getDisplayName() + " accepted your friend request",
                acceptedContact.getContact().getId().toString()
        );
        return toContactResponse(acceptedContact);
    }

    @Transactional
    public ContactResponse blockContact(UUID contactRecordId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.BLOCKED);
        contact.setBlockedBy(currentUserId);
        return toContactResponse(contactRepository.save(contact));
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
        return toContactResponse(contactRepository.save(contact));
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
                    .map(this::toContactResponse)
                    .toList();
        }
        // For ACCEPTED: include contacts blocked by others (victim still sees blocker as friend),
        // but exclude contacts the current user has blocked themselves (those go to block list only).
        if (status == ContactStatus.ACCEPTED) {
            return contactRepository.findFriendsAndBlocked(userId).stream()
                    .map(this::toContactResponse)
                    .toList();
        }
        return contactRepository.findByParticipantIdAndStatus(userId, status).stream()
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> getAllContacts(UUID userId) {
        return contactRepository.findByUserIdOrContactId(userId, userId).stream()
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getFriendCount(UUID userId) {
        return contactRepository.countByParticipantIdAndStatus(userId, ContactStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<ContactSuggestionResponse> getSuggestions(UUID userId, Integer limit) {
        List<Contact> directFriendContacts =
                contactRepository.findByParticipantIdAndStatus(userId, ContactStatus.ACCEPTED);
        if (directFriendContacts.isEmpty()) {
            return List.of();
        }

        Set<UUID> excludedUserIds = getExistingRelationshipUserIds(userId);
        Map<UUID, Set<UUID>> mutualFriendIds =
                findMutualFriendCandidateIds(userId, directFriendContacts, excludedUserIds);
        int safeLimit = normalizeSuggestionLimit(limit);
        List<UUID> rankedCandidateIds = rankSuggestionIds(mutualFriendIds, safeLimit);
        Map<UUID, User> suggestedUsers = new HashMap<>();
        userRepository.findAllById(rankedCandidateIds)
                .forEach(user -> suggestedUsers.put(user.getId(), user));

        return rankedCandidateIds.stream()
                .filter(suggestedUsers::containsKey)
                .map(candidateId -> toSuggestionResponse(
                        suggestedUsers.get(candidateId),
                        mutualFriendIds.get(candidateId).size()))
                .toList();
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
                return toContactResponse(contact); // already blocked by this user
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
        return toContactResponse(contactRepository.save(contact));
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
        return toContactResponse(contactRepository.save(contact));
    }

    /**
     * Returns the contact record between current user and another user, or null if none.
     */
    @Transactional(readOnly = true)
    public ContactResponse getContactByUser(UUID currentUserId, UUID otherUserId) {
        return contactRepository.findByParticipants(currentUserId, otherUserId)
                .map(this::toContactResponse)
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
            if (!userSettingsService.isFriendListVisible(targetUserId.toString())) {
                throw new AppException(ErrorCode.FRIEND_LIST_HIDDEN);
            }
        }
        return contactRepository.findByParticipantIdAndStatus(targetUserId, ContactStatus.ACCEPTED).stream()
                .map(this::toContactResponse)
                .toList();
    }

    private Set<UUID> getExistingRelationshipUserIds(UUID userId) {
        Set<UUID> userIds = new HashSet<>();
        userIds.add(userId);
        contactRepository.findByUserIdOrContactId(userId, userId)
                .forEach(contact -> userIds.add(getOtherUserId(contact, userId)));
        return userIds;
    }

    private Map<UUID, Set<UUID>> findMutualFriendCandidateIds(
            UUID userId,
            List<Contact> directFriendContacts,
            Set<UUID> excludedUserIds) {
        Map<UUID, Set<UUID>> candidateMutualFriendIds = new HashMap<>();
        for (Contact directFriendContact : directFriendContacts) {
            UUID friendId = getOtherUserId(directFriendContact, userId);
            contactRepository.findByParticipantIdAndStatus(friendId, ContactStatus.ACCEPTED)
                    .stream()
                    .map(contact -> getOtherUserId(contact, friendId))
                    .filter(candidateId -> !excludedUserIds.contains(candidateId))
                    .forEach(candidateId -> candidateMutualFriendIds
                            .computeIfAbsent(candidateId, ignored -> new HashSet<>())
                            .add(friendId));
        }
        return candidateMutualFriendIds;
    }

    private List<UUID> rankSuggestionIds(Map<UUID, Set<UUID>> mutualFriendIds, int limit) {
        return mutualFriendIds.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<UUID, Set<UUID>>>comparingInt(entry -> entry.getValue().size())
                        .reversed()
                        .thenComparing(entry -> entry.getKey().toString()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private ContactSuggestionResponse toSuggestionResponse(User user, int mutualFriendCount) {
        return contactSuggestionMapper.toResponse(user, mutualFriendCount);
    }

    private UUID getOtherUserId(Contact contact, UUID userId) {
        return contact.getUser().getId().equals(userId)
                ? contact.getContact().getId()
                : contact.getUser().getId();
    }

    private int normalizeSuggestionLimit(Integer limit) {
        int requested = limit == null ? DEFAULT_SUGGESTION_LIMIT : limit;
        return Math.max(MIN_SUGGESTION_LIMIT, Math.min(requested, MAX_SUGGESTION_LIMIT));
    }

    private ContactResponse toContactResponse(Contact contact) {
        ContactResponse response = contactMapper.toResponse(contact);
        userSettingsService.applyPresencePrivacy(response.getUser());
        userSettingsService.applyPresencePrivacy(response.getContact());
        return response;
    }
}
