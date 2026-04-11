package com.chatly.repository.mongo;

import com.chatly.model.mongo.FileMetadata;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FileMetadataRepository extends MongoRepository<FileMetadata, String> {

    List<FileMetadata> findByConversationId(String conversationId);

    List<FileMetadata> findByConversationIdOrderByCreatedAtDesc(String conversationId);

    List<FileMetadata> findByUploadedBy(String uploadedBy);
}
