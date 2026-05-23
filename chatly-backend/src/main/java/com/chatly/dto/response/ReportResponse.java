package com.chatly.dto.response;

import com.chatly.model.enums.ReportReason;
import com.chatly.model.enums.ReportStatus;
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
public class ReportResponse {

    private String id;
    private String postId;
    private String reporterId;
    private String reporterUsername;
    private String reporterDisplayName;
    private String reportedUserId;
    private String reportedUserUsername;
    private String reportedUserDisplayName;
    private ReportReason reason;
    private String description;
    private ReportStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
