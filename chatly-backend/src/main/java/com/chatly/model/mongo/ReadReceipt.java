package com.chatly.model.mongo;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadReceipt {

    private String userId;
    private Instant readAt;
}
