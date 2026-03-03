package com.chatly.service;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.ContactResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ContactMapper;
import com.chatly.model.enums.ContactStatus;
import com.chatly.model.postgres.Contact;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final ContactMapper contactMapper;

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

        return contactMapper.toResponse(contactRepository.save(newContact));
    }

    @Transactional
    public ContactResponse acceptRequest(UUID contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.ACCEPTED);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    @Transactional
    public ContactResponse blockContact(UUID contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));

        contact.setStatus(ContactStatus.BLOCKED);
        return contactMapper.toResponse(contactRepository.save(contact));
    }

    public List<ContactResponse> getContacts(UUID userId, ContactStatus status) {
        return contactRepository.findByUserIdAndStatus(userId, status).stream()
                .map(contactMapper::toResponse)
                .toList();
    }

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
