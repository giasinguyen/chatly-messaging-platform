package com.chatly.repository.mongo;

import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PostRepository extends MongoRepository<Post, String>, PostRepositoryCustom {

    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Post> findByAuthorIdAndIsDeletedFalseOrderByCreatedAtDesc(String authorId, Pageable pageable);

    Page<Post> findByVisibilityAndIsDeletedFalseOrderByCreatedAtDesc(PostVisibility visibility, Pageable pageable);

    Page<Post> findByAuthorIdOrderByCreatedAtDesc(String authorId, Pageable pageable);

    Page<Post> findByVisibilityOrderByCreatedAtDesc(PostVisibility visibility, Pageable pageable);

    long countByAuthorIdAndIsDeletedFalse(String authorId);

    long countByAuthorId(String authorId);
}
