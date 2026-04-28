package com.chatly.dto.request;

import com.chatly.model.enums.ReactionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReactToPostRequest {

    @NotNull(message = "Reaction type is required")
    private ReactionType type;
}
