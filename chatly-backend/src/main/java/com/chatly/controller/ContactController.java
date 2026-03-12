package com.chatly.controller;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ContactResponse;
import com.chatly.model.enums.ContactStatus;
import com.chatly.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    // Gửi lời mời kết bạn (userId lấy từ JWT, không nhận từ URL)
    @PostMapping
    ApiResponse<ContactResponse> sendRequest(@RequestBody @Valid ContactRequest request) {
        return ApiResponse.<ContactResponse>builder()
                .result(contactService.sendRequest(getAuthenticatedUserId(), request))
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

    // Lấy tất cả contact của user đang đăng nhập
    @GetMapping
    ApiResponse<List<ContactResponse>> getAll() {
        return ApiResponse.<List<ContactResponse>>builder()
                .result(contactService.getAllContacts(getAuthenticatedUserId()))
                .build();
    }

    // Lọc theo trạng thái
    @GetMapping("/status/{status}")
    ApiResponse<List<ContactResponse>> getByStatus(@PathVariable ContactStatus status) {
        return ApiResponse.<List<ContactResponse>>builder()
                .result(contactService.getContacts(getAuthenticatedUserId(), status))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable UUID id) {
        contactService.deleteContact(id);
        return ApiResponse.<Void>builder()
                .message("Contact deleted successfully")
                .build();
    }

    private UUID getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return UUID.fromString(authentication.getPrincipal().toString());
    }
}
