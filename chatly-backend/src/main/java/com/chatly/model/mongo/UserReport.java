package com.chatly.model.mongo;

import com.chatly.model.enums.ReportReason;
import com.chatly.model.enums.ReportStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "user_reports")
@CompoundIndexes({
        @CompoundIndex(def = "{'reportedUserId': 1, 'createdAt': -1}"),
        @CompoundIndex(def = "{'reporterId': 1, 'createdAt': -1}"),
        @CompoundIndex(def = "{'status': 1, 'createdAt': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserReport {

    @Id
    private String id;

    private String reporterId;

    private String reportedUserId;

    private ReportReason reason;

    private String description;

    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
