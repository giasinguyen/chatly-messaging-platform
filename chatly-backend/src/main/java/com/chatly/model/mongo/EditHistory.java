package com.chatly.model.mongo;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditHistory {
    private String content;
    private Instant editedAt;
}
