package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddMemberRequest {

    @NotBlank(message = "userId is required")
    private String userId;
}
