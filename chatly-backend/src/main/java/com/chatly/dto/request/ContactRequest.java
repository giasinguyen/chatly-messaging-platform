package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactRequest {

    @NotBlank(message = "INVALID_KEY")
    private String contactId;
}
