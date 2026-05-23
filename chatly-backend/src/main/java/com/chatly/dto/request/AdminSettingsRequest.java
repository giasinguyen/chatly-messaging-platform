package com.chatly.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSettingsRequest {

    private Boolean publicRegistrationEnabled;

    private Boolean userReportsEnabled;

    private Boolean aiProactiveRepliesEnabled;

    private Boolean maintenanceBannerEnabled;

    @Min(1)
    @Max(365)
    private Integer sessionTimeoutDays;

    @Min(1)
    @Max(2048)
    private Integer maxUploadSizeMb;

    @Min(0)
    private Integer messageRetentionDays;

    @Min(1)
    @Max(3600)
    private Integer rateLimitWindowSeconds;
}
