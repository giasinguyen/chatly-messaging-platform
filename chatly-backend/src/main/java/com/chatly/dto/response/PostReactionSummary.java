package com.chatly.dto.response;

import com.chatly.model.enums.ReactionType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostReactionSummary {

    private ReactionType type;
    private long count;
    private boolean reactedByMe;
}
