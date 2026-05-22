package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatsResponse {

    private long totalUsers;
    private long activeUsers;
    private long totalConversations;
    private long totalMessages;
    
    private List<UserGrowthData> userGrowth;
    private List<SystemHealthStatus> systemHealth;
    private List<AdminActivityLog> recentActivity;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserGrowthData {
        private String date;
        private long count;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemHealthStatus {
        private String service;
        private double statusRate;
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminActivityLog {
        private String id;
        private String type;
        private String title;
        private String description;
        private Instant timestamp;
    }
}
