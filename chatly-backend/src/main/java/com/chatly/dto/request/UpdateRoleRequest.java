package com.chatly.dto.request;

import com.chatly.model.enums.GroupRole;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoleRequest {

    @NotNull(message = "role is required")
    private GroupRole role;
}
