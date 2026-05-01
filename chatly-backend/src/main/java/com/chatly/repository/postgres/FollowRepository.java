package com.chatly.repository.postgres;

import com.chatly.model.postgres.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FollowRepository extends JpaRepository<Follow, UUID> {

    @Query("""
            select f.follower.id
            from Follow f
            where f.followee.id = :followeeId
            """)
    Page<UUID> findFollowerIdsByFolloweeId(@Param("followeeId") UUID followeeId, Pageable pageable);

    @Query("""
            select f.followee.id
            from Follow f
            where f.follower.id = :followerId
            """)
    Page<UUID> findFollowingIdsByFollowerId(@Param("followerId") UUID followerId, Pageable pageable);

    @Query("""
            select count(f) > 0
            from Follow f
            where f.follower.id = :followerId
              and f.followee.id = :followeeId
            """)
        boolean existsByFollowerIdAndFolloweeId(@Param("followerId") UUID followerId,
                                                                                        @Param("followeeId") UUID followeeId);

    @Query("""
            select f
            from Follow f
            where f.follower.id = :followerId
              and f.followee.id = :followeeId
            """)
        Optional<Follow> findByFollowerIdAndFolloweeId(@Param("followerId") UUID followerId,
                                                                                                   @Param("followeeId") UUID followeeId);

    @Query("""
            select count(f)
            from Follow f
            where f.followee.id = :followeeId
            """)
        long countByFolloweeId(@Param("followeeId") UUID followeeId);

    @Query("""
            select count(f)
            from Follow f
            where f.follower.id = :followerId
            """)
        long countByFollowerId(@Param("followerId") UUID followerId);
}
