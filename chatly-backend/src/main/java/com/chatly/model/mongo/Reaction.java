package com.chatly.model.mongo;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reaction {

    private String userId;
    private String emoji;
    private Instant createdAt;
}
