package com.chatly.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockStatusResponse {

    /** True if any block relationship exists between the two users. */
    private boolean blocked;

    /** UUID of the user who performed the block, or null if not blocked. */
    private String blockedBy;

    /**
     * "I_BLOCKED"  – the current user blocked the target user.
     * "BLOCKED_ME" – the target user blocked the current user.
     * null         – no block relationship.
     */
    private String direction;
}
