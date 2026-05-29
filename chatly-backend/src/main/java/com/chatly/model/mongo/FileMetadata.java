package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "file_metadata")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadata {

    @Id
    private String id;

    /** Storage provider that holds this file, such as "local" or "s3". */
    private String provider;

    /** Provider-specific key / path used for deletion. */
    private String storageKey;

    /** Public URL to access the file. */
    private String url;

    /** Original filename as supplied by the client. */
    private String fileName;

    /** MIME type, e.g. "image/jpeg", "application/pdf". */
    private String fileType;

    /** File size in bytes. */
    private Long fileSize;

    /** User who uploaded this file. */
    @Indexed
    private String uploadedBy;

    /** Conversation the file belongs to, when this is a chat attachment. */
    @Indexed
    private String conversationId;

    /** Client feature that created the upload, such as "CLOUD". */
    @Indexed
    private String uploadSource;

    @CreatedDate
    private Instant createdAt;
}
