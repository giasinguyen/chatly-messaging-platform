# Feed Service — Social Layer Analysis & Implementation Plan

## 1. Existing Social Code Inventory

### MongoDB Documents (relevant)
| Class | Collection | Key Fields |
|---|---|---|
| `Post` | `posts` | `id`, `authorId`, `content`, `mediaUrls`, `visibility` (`PostVisibility`), `hashtags`, `reactions` (`List<PostReaction>`), `commentCount`, `shareCount`, `createdAt`, `updatedAt` |
| `PostReaction` | embedded in `Post` | `userId`, `type` (`ReactionType`), `createdAt` |

**Existing compound indexes on `posts`:**
```
{ authorId: 1, createdAt: -1 }
{ visibility: 1, createdAt: -1 }
```
Both indexes already match the feed query requirements. ✅

### PostgreSQL Entities (relevant)
| Class | Table | Key Fields |
|---|---|---|
| `Contact` | `contacts` | `id`, `user` (User FK), `contact` (User FK), `status` (`ContactStatus`), `blockedBy` (UUID), `createdAt` |

**`ContactStatus` enum:** `PENDING`, `ACCEPTED`, `BLOCKED`

**`PostVisibility` enum:** `PUBLIC`, `FOLLOWERS_ONLY`, `FRIENDS_ONLY`, `ONLY_ME`

### Existing Repositories
| Repo | Type | Relevant Methods |
|---|---|---|
| `PostRepository` | MongoRepository | `findByAuthorIdOrderByCreatedAtDesc`, `findByVisibilityOrderByCreatedAtDesc` |
| `ContactRepository` | JpaRepository | `findBlockedByUser(userId)`, `findByParticipantIdAndStatus(userId, status)`, `findByParticipants(userId, otherId)` |

### Existing Services
| Service | Key methods relevant to Feed |
|---|---|
| `PostService` | `create`, `getFeed` (basic PUBLIC only, no cursor), `getByAuthor`, `getById`, `react`, `removeReaction` |
| `ContactService` | `isBlocked`, `isBlockedBy`, `getContacts` (by status) |

**No `FollowRepository` or follow concept exists yet** — the social graph uses the `Contact` (friend) model.
The spec says `followRepository.findFollowingIds(userId)` — this does **not exist** in the current model.
The Contact table models **bidirectional friendship**, not a follow graph.

> **Key design decision required:** The task spec assumes a separate follow system (one-directional).
> The existing model uses `Contact.ACCEPTED` for bidirectional friends.
> **For the skeleton implementation:** we map "following" = contacts where this user sent the request (`contact.user.id = userId` AND `status = ACCEPTED`) **or** treat all ACCEPTED contacts as mutual follows.
> The spec says "tích hợp followService.getFollowingIds() khi Dev 1 merge" — so we build a stub/adapter that reads from `ContactRepository` until the real follow table arrives.

### Existing DTOs
| DTO | Fields |
|---|---|
| `PostResponse` | `id`, `authorId`, `content`, `mediaUrls`, `visibility`, `hashtags`, `reactions` (List<PostReactionSummary>), `commentCount`, `shareCount`, `createdAt`, `updatedAt` |
| `PostReactionSummary` | `type`, `count`, `reactedByMe` |
| `PagedResponse<T>` | `items`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious` — **offset-based, NOT cursor-based** |

**We need a new cursor-based response: `FeedResponse`.**

### Existing `PostMapper`
- `toResponse(Post)` — maps all fields except `reactions` (ignored, filled by service)

### ErrorCode gaps
- `POST_NOT_FOUND` = 1900, `POST_FORBIDDEN` = 1901
- **Note:** `SETTINGS_INVALID_SECTION` also uses code 1900 — **duplicate numeric code**. Do not reuse 1900 range for feed. Use 1902+ for new feed errors.

### Security Config
- `anyRequest().authenticated()` covers all `/api/feed/**` automatically — no explicit whitelisting needed.

---

## 2. What Needs to Be Built

### New Files

| File | Type | Purpose |
|---|---|---|
| `dto/response/FeedResponse.java` | DTO | `{ items, nextCursor, hasMore }` |
| `service/FeedService.java` | Service | Home feed, user feed, explore feed logic |
| `controller/FeedController.java` | Controller | `GET /api/feed/home`, `/api/feed/user/{userId}`, `/api/feed/explore` |
| `FeedServiceTest.java` | Test | ≥ 6 test cases |

### Modified Files

| File | Change |
|---|---|
| `repository/postgres/ContactRepository.java` | Add `findFollowingIds(UUID userId)` JPQL query returning `List<String>` |
| `repository/mongo/PostRepository.java` | Add cursor-based query methods using `MongoTemplate` (custom impl) or `@Query` |
| `model/mongo/Post.java` | Add `isDeleted` field (required by spec query: `isDeleted: false`) |

---

## 3. Follow vs Friend Model Gap

The spec references `followRepository.findFollowingIds(userId)` but **no follow system exists**.

**Skeleton strategy (until Dev 1 merges the follow table):**

```java
// In ContactRepository — maps friend requests sent BY userId as "following"
@Query("SELECT CAST(c.contact.id AS string) FROM Contact c WHERE c.user.id = :userId AND c.status = 'ACCEPTED'")
List<String> findFollowingIds(@Param("userId") UUID userId);
```

This returns users that `userId` added as friends (unilateral direction from the `contacts.user_id` side). When the real follow table arrives, swap this one query.

---

## 4. `isDeleted` Field

The spec MongoDB query requires `isDeleted: false`. The `Post` document currently has **no `isDeleted` field**. Two options:
1. Add `isDeleted` to `Post` and use it in the query.
2. Skip `isDeleted` in the feed query (posts are permanently deleted via `postRepository.delete()`).

> **Decision:** Add `isDeleted` to `Post` for soft-delete readiness. Default = `false`. The existing `PostService.delete()` does a hard delete — leave it as-is. Feed query simply filters `{ isDeleted: false }`.

---

## 5. Cursor Design

- Cursor = ISO-8601 `createdAt` of the last item on the current page.
- Feed query: `createdAt < cursorTime` (strict less-than prevents duplicates).
- Null cursor → use `Instant.now()` as the upper bound.
- `nextCursor` returned only when `hasMore = true`.
- Format: `"2026-04-26T10:00:00.000Z"` (`.toString()` on `Instant` gives ISO-8601 UTC).

---

## 6. Explore Feed — Engagement Score

The spec: `engagementScore = likeCount + commentCount*2 + shareCount*3`

- "likeCount" = `reactions.size()` (all reaction types count equally for engagement).
- Sort in-memory or via MongoDB aggregation pipeline.
- Time window: last 7 days (`createdAt >= Instant.now().minus(7, DAYS)`).
- Visibility filter: `PUBLIC` only (explore is public).

> **Important:** MongoDB `MongoTemplate` aggregation is needed for computed sort. Spring Data `@Query` can't sort by a computed field. Use `MongoTemplate` + `Aggregation`.

---

## 7. MongoDB Custom Repository Pattern

Spring Data MongoDB doesn't support cursor-based pagination natively with `MongoRepository`. We'll use `MongoTemplate` in a custom impl:

```java
// PostRepositoryCustom interface + PostRepositoryCustomImpl
// Then PostRepository extends MongoRepository<Post, String>, PostRepositoryCustom
```

---

## 8. Acceptance Criteria Mapping

| Criterion | Implementation |
|---|---|
| Feed excludes own posts | `authorId != userId` added to query `$nin` |
| Posts of blocked users hidden | `blockedIds` from `contactRepository.findBlockedByUser` used in `$nin` |
| Empty following → `{items:[], nextCursor:null, hasMore:false}` | Early return before DB call |
| No duplicate items across pages | Strict `$lt cursorTime` ensures no overlap |
| Max `size` items | `limit(size)` — fetch `size+1` to detect hasMore, return only first `size` |
| MongoDB uses index | Compound index `{authorId:1, createdAt:-1}` covers home feed query |
| FeedServiceTest ≥ 6 cases | See test plan below |

---

## 9. Test Plan — FeedServiceTest (6 required cases)

| # | Test Name | Scenario |
|---|---|---|
| 1 | `getHomeFeed_withFollowing_shouldReturnSortedItems` | Following non-empty, returns items sorted newest first |
| 2 | `getHomeFeed_emptyFollowing_shouldReturnEmptyFeed` | No following → empty result, no DB call to posts |
| 3 | `getHomeFeed_withCursor_shouldFetchNextPage` | Cursor parses correctly, items returned are older than cursor |
| 4 | `getHomeFeed_excludesBlockedUsers` | Blocked user's posts not in result |
| 5 | `getHomeFeed_respectsVisibility_followersOnly` | `FOLLOWERS_ONLY` post shown to follower, excluded for non-follower |
| 6 | `getHomeFeed_excludesOwnPosts` | Posts where `authorId == userId` not in result |

---

## 10. Implementation Order

1. **`Post.java`** — add `isDeleted` field
2. **`FeedResponse.java`** — new response DTO
3. **`PostRepositoryCustom` + `PostRepositoryCustomImpl`** — cursor query + explore aggregation
4. **`PostRepository`** — extend custom interface
5. **`ContactRepository`** — add `findFollowingIds` + `findBlockedUserIds`
6. **`FeedService`** — full business logic
7. **`FeedController`** — 3 endpoints
8. **`FeedServiceTest`** — 6 test cases
