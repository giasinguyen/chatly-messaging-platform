package com.chatly.dto.request;

import com.chatly.model.enums.ConversationType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationRequest {

    @NotNull(message = "INVALID_KEY")
    private ConversationType type;

    private String name;

    @NotEmpty(message = "INVALID_KEY")
    private List<String> participantIds;
}
