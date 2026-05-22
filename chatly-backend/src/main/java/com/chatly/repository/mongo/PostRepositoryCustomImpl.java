package com.chatly.repository.mongo;

import com.chatly.dto.response.TrendingHashtagResponse;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Post;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;
import org.bson.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Repository
@RequiredArgsConstructor
public class PostRepositoryCustomImpl implements PostRepositoryCustom {

    private static final String FIELD_AUTHOR_ID   = "authorId";
    private static final String FIELD_CONTENT     = "content";
    private static final String FIELD_HASHTAGS    = "hashtags";
    private static final String FIELD_CREATED_AT  = "createdAt";
    private static final String FIELD_VISIBILITY  = "visibility";
    private static final String FIELD_IS_DELETED  = "isDeleted";
    private static final String COMPUTED_SCORE    = "engagementScore";
    private static final String FIELD_REACTIONS   = "reactions";
    private static final String FIELD_COMMENT_COUNT = "commentCount";
    private static final String FIELD_SHARE_COUNT = "shareCount";

    private final MongoTemplate mongoTemplate;

    @Override
    public List<Post> findFeedPosts(
            List<String> authorIds,
            List<String> excludeIds,
            List<PostVisibility> visibilities,
            Instant before,
            int limit
    ) {
        Criteria criteria = Criteria.where(FIELD_AUTHOR_ID).in(authorIds)
                .and(FIELD_IS_DELETED).is(false)
                .and(FIELD_CREATED_AT).lt(before)
                .and(FIELD_VISIBILITY).in(visibilities);

        if (!excludeIds.isEmpty()) {
            criteria.and(FIELD_AUTHOR_ID).nin(excludeIds);
        }

        Query query = new Query(criteria)
                .with(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT))
                .limit(limit);

        return mongoTemplate.find(query, Post.class);
    }

    @Override
    public List<Post> findExplorePosts(Instant since, Instant before, int limit) {
        MatchOperation match = Aggregation.match(
                Criteria.where(FIELD_VISIBILITY).is(PostVisibility.PUBLIC)
                        .and(FIELD_IS_DELETED).is(false)
                        .and(FIELD_CREATED_AT).gte(since).lt(before)
        );

        // engagementScore = reactions.size() + commentCount * 2 + shareCount * 3
        AddFieldsOperation addScore = Aggregation.addFields()
                .addFieldWithValue(
                        COMPUTED_SCORE,
                        ArithmeticOperators.Add.valueOf(
                                ArrayOperators.Size.lengthOfArray("reactions")
                        ).add(
                                ArithmeticOperators.Multiply.valueOf("commentCount").multiplyBy(2)
                        ).add(
                                ArithmeticOperators.Multiply.valueOf("shareCount").multiplyBy(3)
                        )
                ).build();

        SortOperation sort = Aggregation.sort(
                Sort.by(Sort.Direction.DESC, COMPUTED_SCORE)
                        .and(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT))
        );

        LimitOperation limitOp = Aggregation.limit(limit);

        Aggregation aggregation = Aggregation.newAggregation(match, addScore, sort, limitOp);
        return mongoTemplate.aggregate(aggregation, "posts", Post.class).getMappedResults();
    }

    @Override
    public Page<Post> searchPublicPosts(String keyword, String hashtag, Pageable pageable) {
        Criteria combined = buildSearchCriteria(keyword, hashtag);
        if (isEngagementScoreSort(pageable.getSort())) {
            return searchPublicPostsByEngagement(combined, pageable);
        }

        Query query = new Query(combined).with(pageable);
        List<Post> posts = mongoTemplate.find(query, Post.class);
        long total = mongoTemplate.count(new Query(combined), Post.class);

        return new PageImpl<>(posts, pageable, total);
    }

    private Criteria buildSearchCriteria(String keyword, String hashtag) {
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where(FIELD_VISIBILITY).is(PostVisibility.PUBLIC));
        filters.add(Criteria.where(FIELD_IS_DELETED).is(false));

        if (keyword != null && !keyword.isBlank()) {
            filters.add(Criteria.where(FIELD_CONTENT)
                    .regex(Pattern.compile(Pattern.quote(keyword.trim()), Pattern.CASE_INSENSITIVE)));
        }

        if (hashtag != null && !hashtag.isBlank()) {
            filters.add(Criteria.where(FIELD_HASHTAGS).is(hashtag.trim().toLowerCase()));
        }

        return new Criteria().andOperator(filters.toArray(new Criteria[0]));
    }

    private Page<Post> searchPublicPostsByEngagement(Criteria criteria, Pageable pageable) {
        MatchOperation match = Aggregation.match(criteria);
        AddFieldsOperation addScore = addEngagementScore();
        SortOperation sort = Aggregation.sort(
                Sort.by(Sort.Direction.DESC, COMPUTED_SCORE)
                        .and(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT))
        );
        SkipOperation skip = Aggregation.skip(pageable.getOffset());
        LimitOperation limit = Aggregation.limit(pageable.getPageSize());
        Aggregation aggregation = Aggregation.newAggregation(
                match,
                addScore,
                sort,
                skip,
                limit
        );
        List<Post> posts = mongoTemplate.aggregate(aggregation, "posts", Post.class)
                .getMappedResults();
        long total = mongoTemplate.count(new Query(criteria), Post.class);
        return new PageImpl<>(posts, pageable, total);
    }

    private AddFieldsOperation addEngagementScore() {
        return Aggregation.addFields()
                .addFieldWithValue(
                        COMPUTED_SCORE,
                        ArithmeticOperators.Add.valueOf(
                                ArrayOperators.Size.lengthOfArray(FIELD_REACTIONS)
                        ).add(
                                ArithmeticOperators.Multiply.valueOf(FIELD_COMMENT_COUNT)
                                        .multiplyBy(2)
                        ).add(
                                ArithmeticOperators.Multiply.valueOf(FIELD_SHARE_COUNT)
                                        .multiplyBy(3)
                        )
                ).build();
    }

    private boolean isEngagementScoreSort(Sort sort) {
        Sort.Order order = sort.getOrderFor(COMPUTED_SCORE);
        return order != null && order.isDescending();
    }

    @Override
    public List<TrendingHashtagResponse> findTrendingHashtags(Instant since, int limit) {
        MatchOperation match = Aggregation.match(
                Criteria.where(FIELD_VISIBILITY).is(PostVisibility.PUBLIC)
                        .and(FIELD_IS_DELETED).is(false)
                        .and(FIELD_CREATED_AT).gte(since)
                        .and(FIELD_HASHTAGS).exists(true).ne(List.of())
        );

        UnwindOperation unwindHashtags = Aggregation.unwind(FIELD_HASHTAGS);

        GroupOperation groupByHashtag = Aggregation.group(FIELD_HASHTAGS)
                .count().as("usageCount");

        SortOperation sortByUsage = Aggregation.sort(
                Sort.by(Sort.Direction.DESC, "usageCount")
                        .and(Sort.by(Sort.Direction.ASC, "_id"))
        );

        LimitOperation limitOperation = Aggregation.limit(limit);

        Aggregation aggregation = Aggregation.newAggregation(
                match,
                unwindHashtags,
                groupByHashtag,
                sortByUsage,
                limitOperation
        );

        AggregationResults<Document> results = mongoTemplate.aggregate(
                aggregation,
                "posts",
                Document.class
        );

        return results.getMappedResults().stream()
                .filter(document -> {
                    String hashtag = document.getString("_id");
                    return hashtag != null && !hashtag.isBlank();
                })
                .map(document -> TrendingHashtagResponse.builder()
                        .hashtag(document.getString("_id"))
                        .postCount(document.get("usageCount", Number.class).longValue())
                        .build())
                .toList();
    }
}
