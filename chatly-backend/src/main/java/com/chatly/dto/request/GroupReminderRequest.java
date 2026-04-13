package com.chatly.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupReminderRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @Future(message = "REMINDER_TIME_IN_PAST")
    private Instant remindAt;
}
