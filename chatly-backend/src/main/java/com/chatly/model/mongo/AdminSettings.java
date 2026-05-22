package com.chatly.model.mongo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "admin_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSettings {

    @Id
    private String id;

    @Builder.Default
    private boolean publicRegistrationEnabled = true;

    @Builder.Default
    private boolean userReportsEnabled = true;

    @Builder.Default
    private boolean aiProactiveRepliesEnabled = false;

    @Builder.Default
    private boolean maintenanceBannerEnabled = false;

    @Builder.Default
    private int sessionTimeoutDays = 7;

    @Builder.Default
    private int maxUploadSizeMb = 25;

    @Builder.Default
    private int messageRetentionDays = 0;

    @Builder.Default
    private int rateLimitWindowSeconds = 60;

    @LastModifiedDate
    private Instant updatedAt;
}
