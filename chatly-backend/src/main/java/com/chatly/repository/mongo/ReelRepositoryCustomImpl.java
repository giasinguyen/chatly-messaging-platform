package com.chatly.repository.mongo;

import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Reel;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ReelRepositoryCustomImpl implements ReelRepositoryCustom {

    private static final String FIELD_AUTHOR_ID = "authorId";
    private static final String FIELD_CREATED_AT = "createdAt";
    private static final String FIELD_VISIBILITY = "visibility";
    private static final String FIELD_IS_DELETED = "isDeleted";

    private final MongoTemplate mongoTemplate;

    @Override
    public List<Reel> findVisibleFeedReels(
            String requesterId,
            List<String> friendIds,
            List<String> blockedIds,
            Instant before,
            int limit
    ) {
        List<Criteria> visibilityRules = new ArrayList<>();
        visibilityRules.add(Criteria.where(FIELD_VISIBILITY).is(PostVisibility.PUBLIC));
        visibilityRules.add(Criteria.where(FIELD_AUTHOR_ID).is(requesterId));
        if (!friendIds.isEmpty()) {
            visibilityRules.add(new Criteria().andOperator(
                    Criteria.where(FIELD_AUTHOR_ID).in(friendIds),
                    Criteria.where(FIELD_VISIBILITY).is(PostVisibility.FRIENDS_ONLY)
            ));
        }

        Criteria criteria = new Criteria().andOperator(
                Criteria.where(FIELD_IS_DELETED).is(false),
                Criteria.where(FIELD_CREATED_AT).lt(before),
                new Criteria().orOperator(visibilityRules.toArray(new Criteria[0]))
        );

        if (!blockedIds.isEmpty()) {
            criteria.and(FIELD_AUTHOR_ID).nin(blockedIds);
        }

        Query query = new Query(criteria)
                .with(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT))
                .limit(limit);
        return mongoTemplate.find(query, Reel.class);
    }

    @Override
    public List<Reel> findVisibleAuthorReels(
            String authorId,
            List<PostVisibility> visibilities,
            Instant before,
            int limit
    ) {
        Query query = new Query(
                Criteria.where(FIELD_AUTHOR_ID).is(authorId)
                        .and(FIELD_IS_DELETED).is(false)
                        .and(FIELD_CREATED_AT).lt(before)
                        .and(FIELD_VISIBILITY).in(visibilities)
        )
                .with(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT))
                .limit(limit);
        return mongoTemplate.find(query, Reel.class);
    }
}
