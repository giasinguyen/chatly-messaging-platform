package com.chatly.dto.response;

import com.chatly.model.enums.QrLoginStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QrLoginStatusResponse {
    private QrLoginStatus status;
    private AuthResponse result; // Only populated when status is SUCCESS
}
