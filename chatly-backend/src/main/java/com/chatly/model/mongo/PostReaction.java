package com.chatly.model.mongo;

import com.chatly.model.enums.ReactionType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostReaction {

    private String userId;
    private ReactionType type;
    private Instant createdAt;
}
