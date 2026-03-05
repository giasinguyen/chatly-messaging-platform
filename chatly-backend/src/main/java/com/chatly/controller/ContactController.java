package com.chatly.controller;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ContactResponse;
import com.chatly.model.enums.ContactStatus;
import com.chatly.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @PostMapping("/{userId}")
    ApiResponse<ContactResponse> sendRequest(
            @PathVariable UUID userId,
            @RequestBody @Valid ContactRequest request) {
        return ApiResponse.<ContactResponse>builder()
                .result(contactService.sendRequest(userId, request))
                .build();
    }

    @PutMapping("/{id}/accept")
    ApiResponse<ContactResponse> accept(@PathVariable UUID id) {
        return ApiResponse.<ContactResponse>builder()
                .result(contactService.acceptRequest(id))
                .build();
    }

    @PutMapping("/{id}/block")
    ApiResponse<ContactResponse> block(@PathVariable UUID id) {
        return ApiResponse.<ContactResponse>builder()
                .result(contactService.blockContact(id))
                .build();
    }

    @GetMapping("/user/{userId}")
    ApiResponse<List<ContactResponse>> getAll(@PathVariable UUID userId) {
        return ApiResponse.<List<ContactResponse>>builder()
                .result(contactService.getAllContacts(userId))
                .build();
    }

    @GetMapping("/user/{userId}/status/{status}")
    ApiResponse<List<ContactResponse>> getByStatus(
            @PathVariable UUID userId,
            @PathVariable ContactStatus status) {
        return ApiResponse.<List<ContactResponse>>builder()
                .result(contactService.getContacts(userId, status))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable UUID id) {
        contactService.deleteContact(id);
        return ApiResponse.<Void>builder()
                .message("Contact deleted successfully")
                .build();
    }
}
