package com.chatly.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSettingsResponse {

    private String id;
    private boolean publicRegistrationEnabled;
    private boolean userReportsEnabled;
    private boolean aiProactiveRepliesEnabled;
    private boolean maintenanceBannerEnabled;
    private int sessionTimeoutDays;
    private int maxUploadSizeMb;
    private int messageRetentionDays;
    private int rateLimitWindowSeconds;
    private Instant updatedAt;
}
