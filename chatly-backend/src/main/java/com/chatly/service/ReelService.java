package com.chatly.service;

import com.chatly.dto.request.CreatePostCommentRequest;
import com.chatly.dto.request.CreateReelRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.response.PostCommentResponse;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.ReelFeedResponse;
import com.chatly.dto.response.ReelResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ReelMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.FileMetadata;
import com.chatly.model.mongo.PostComment;
import com.chatly.model.mongo.PostReaction;
import com.chatly.model.mongo.Reel;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.FileMetadataRepository;
import com.chatly.repository.mongo.ReelRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.storage.StorageProvider;
import com.chatly.storage.UploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReelService {

    private static final String REEL_UPLOAD_FOLDER = "reels";
    private static final int MAX_CAPTION_LENGTH = 1000;
    private static final Set<String> ALLOWED_VIDEO_MIME_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime", "video/3gpp"
    );
    private static final List<PostVisibility> PUBLIC_VISIBILITIES = List.of(PostVisibility.PUBLIC);
    private static final List<PostVisibility> FRIEND_VISIBILITIES =
            List.of(PostVisibility.PUBLIC, PostVisibility.FRIENDS_ONLY);
    private static final List<PostVisibility> OWNER_VISIBILITIES =
            List.of(PostVisibility.PUBLIC, PostVisibility.FRIENDS_ONLY, PostVisibility.ONLY_ME);

    private final ReelRepository reelRepository;
    private final ReelMapper reelMapper;
    private final StorageProvider storageProvider;
    private final FileMetadataRepository fileMetadataRepository;
    private final ContactRepository contactRepository;
    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Value("${app.reels.max-video-size-mb:20}")
    private long maxVideoSizeMb;

    @Transactional
    public ReelResponse create(String authorId, CreateReelRequest request, MultipartFile video) {
        validateVideo(video);
        UploadResult upload = storageProvider.upload(video, REEL_UPLOAD_FOLDER);
        FileMetadata metadata = saveFileMetadata(video, upload, authorId);

        Reel reel = Reel.builder()
                .authorId(authorId)
                .caption(normalizeCaption(request.getCaption()))
                .videoUrl(upload.url())
                .fileId(metadata.getId())
                .visibility(resolveVisibility(request.getVisibility()))
                .build();

        reel = reelRepository.save(reel);
        log.info("Reel created: id={}, authorId={}", reel.getId(), authorId);
        return toResponse(reel, loadAuthors(List.of(reel)), authorId);
    }

    @Transactional(readOnly = true)
    public ReelFeedResponse getFeed(String requesterId, String cursor, int size) {
        UUID requesterUuid = parseUuid(requesterId);
        List<Reel> raw = reelRepository.findVisibleFeedReels(
                requesterId,
                findVisibleFriendIds(requesterUuid),
                contactRepository.findBlockedUserIds(requesterUuid),
                parseCursor(cursor),
                size + 1
        );
        return buildFeedResponse(raw, requesterId, size);
    }

    @Transactional(readOnly = true)
    public ReelFeedResponse getByAuthor(String authorId, String requesterId, String cursor, int size) {
        if (contactRepository.findBlockedUserIds(parseUuid(requesterId)).contains(authorId)) {
            return emptyFeed();
        }

        List<Reel> raw = reelRepository.findVisibleAuthorReels(
                authorId,
                resolveAuthorVisibilities(authorId, requesterId),
                parseCursor(cursor),
                size + 1
        );
        return buildFeedResponse(raw, requesterId, size);
    }

    @Transactional(readOnly = true)
    public ReelResponse getById(String reelId, String requesterId) {
        Reel reel = findViewableReel(reelId, requesterId);
        return toResponse(reel, loadAuthors(List.of(reel)), requesterId);
    }

    @Transactional
    public void recordView(String reelId, String viewerId) {
        Reel reel = findReel(reelId);
        if (reel.getAuthorId().equals(viewerId) || !canView(reel, viewerId)) {
            return;
        }
        if (!reel.getViewerIds().contains(viewerId)) {
            reel.getViewerIds().add(viewerId);
            reel.setViewCount(reel.getViewerIds().size());
            reelRepository.save(reel);
        }
    }

    @Transactional
    public ReelResponse react(String reelId, String userId, ReactToPostRequest request) {
        Reel reel = findViewableReel(reelId, userId);
        List<PostReaction> reactions = new ArrayList<>(reel.getReactions());
        reactions.removeIf(reaction -> reaction.getUserId().equals(userId));
        reactions.add(PostReaction.builder()
                .userId(userId)
                .type(request.getType())
                .createdAt(Instant.now())
                .build());

        reel.setReactions(reactions);
        reel = reelRepository.save(reel);
        return toResponse(reel, loadAuthors(List.of(reel)), userId);
    }

    @Transactional
    public ReelResponse removeReaction(String reelId, String userId) {
        Reel reel = findViewableReel(reelId, userId);
        reel.getReactions().removeIf(reaction -> reaction.getUserId().equals(userId));
        reel = reelRepository.save(reel);
        return toResponse(reel, loadAuthors(List.of(reel)), userId);
    }

    @Transactional
    public ReelResponse share(String reelId, String userId) {
        Reel reel = findViewableReel(reelId, userId);
        reel.setShareCount(reel.getShareCount() + 1);
        reel = reelRepository.save(reel);
        return toResponse(reel, loadAuthors(List.of(reel)), userId);
    }

    @Transactional(readOnly = true)
    public List<PostCommentResponse> getComments(String reelId, String requesterId) {
        Reel reel = findViewableReel(reelId, requesterId);
        if (reel.getComments().isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, User> usersById = loadUsersById(
                reel.getComments().stream().map(PostComment::getUserId).distinct().toList()
        );
        return reel.getComments().stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(comment -> toCommentResponse(comment, usersById.get(comment.getUserId()), requesterId))
                .toList();
    }

    @Transactional
    public PostCommentResponse addComment(String reelId, String userId, CreatePostCommentRequest request) {
        Reel reel = findViewableReel(reelId, userId);
        String content = request.getContent() != null ? request.getContent().trim() : "";
        List<String> mediaUrls = request.getMediaUrls() != null
                ? new ArrayList<>(request.getMediaUrls())
                : new ArrayList<>();
        String parentCommentId = normalizeParentCommentId(request.getParentCommentId());

        validateCommentInput(reel, content, mediaUrls, parentCommentId);
        PostComment comment = buildComment(userId, content, mediaUrls, parentCommentId);

        List<PostComment> comments = new ArrayList<>(reel.getComments());
        comments.add(comment);
        reel.setComments(comments);
        reel.setCommentCount(comments.size());
        reelRepository.save(reel);

        User commenter = safeUuid(userId).flatMap(userRepository::findById).orElse(null);
        return toCommentResponse(comment, commenter, userId);
    }

    @Transactional
    public PostCommentResponse reactToComment(
            String reelId,
            String commentId,
            String userId,
            ReactToPostRequest request
    ) {
        Reel reel = findViewableReel(reelId, userId);
        PostComment comment = findComment(reel, commentId);

        List<PostReaction> reactions = new ArrayList<>(comment.getReactions());
        reactions.removeIf(reaction -> reaction.getUserId().equals(userId));
        reactions.add(PostReaction.builder()
                .userId(userId)
                .type(request.getType())
                .createdAt(Instant.now())
                .build());
        comment.setReactions(reactions);
        reelRepository.save(reel);

        User commenter = safeUuid(comment.getUserId()).flatMap(userRepository::findById).orElse(null);
        return toCommentResponse(comment, commenter, userId);
    }

    @Transactional
    public PostCommentResponse removeCommentReaction(String reelId, String commentId, String userId) {
        Reel reel = findViewableReel(reelId, userId);
        PostComment comment = findComment(reel, commentId);
        List<PostReaction> reactions = new ArrayList<>(comment.getReactions());
        reactions.removeIf(reaction -> reaction.getUserId().equals(userId));
        comment.setReactions(reactions);
        reelRepository.save(reel);

        User commenter = safeUuid(comment.getUserId()).flatMap(userRepository::findById).orElse(null);
        return toCommentResponse(comment, commenter, userId);
    }

    private void validateVideo(MultipartFile video) {
        if (video == null || video.isEmpty()) {
            throw new AppException(ErrorCode.REEL_VIDEO_REQUIRED);
        }

        long maxBytes = maxVideoSizeMb * 1024L * 1024L;
        if (video.getSize() > maxBytes) {
            throw new AppException(ErrorCode.FILE_SIZE_EXCEEDED);
        }

        String contentType = video.getContentType();
        if (contentType == null || !ALLOWED_VIDEO_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
    }

    private FileMetadata saveFileMetadata(MultipartFile video, UploadResult upload, String authorId) {
        FileMetadata metadata = FileMetadata.builder()
                .provider(upload.provider())
                .storageKey(upload.storageKey())
                .url(upload.url())
                .fileName(video.getOriginalFilename())
                .fileType(video.getContentType())
                .fileSize(video.getSize())
                .uploadedBy(authorId)
                .build();
        return fileMetadataRepository.save(metadata);
    }

    private ReelFeedResponse buildFeedResponse(List<Reel> raw, String requesterId, int size) {
        boolean hasMore = raw.size() > size;
        List<Reel> page = hasMore ? raw.subList(0, size) : raw;
        Map<String, User> authors = loadAuthors(page);
        List<ReelResponse> items = page.stream()
                .map(reel -> toResponse(reel, authors, requesterId))
                .toList();
        String nextCursor = hasMore ? page.get(page.size() - 1).getCreatedAt().toString() : null;
        return ReelFeedResponse.builder()
                .items(items)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    private ReelFeedResponse emptyFeed() {
        return ReelFeedResponse.builder()
                .items(Collections.emptyList())
                .nextCursor(null)
                .hasMore(false)
                .build();
    }

    private ReelResponse toResponse(Reel reel, Map<String, User> authors, String requesterId) {
        ReelResponse response = reelMapper.toResponse(reel);
        response.setReactions(buildReactionSummary(reel, requesterId));
        User author = authors.get(reel.getAuthorId());
        if (author != null) {
            response.setAuthorUsername(author.getUsername());
            response.setAuthorDisplayName(author.getDisplayName());
            response.setAuthorAvatarUrl(author.getAvatarUrl());
        }
        return response;
    }

    private Map<String, User> loadAuthors(List<Reel> reels) {
        List<UUID> authorIds = reels.stream()
                .map(Reel::getAuthorId)
                .distinct()
                .map(this::safeUuid)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        if (authorIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(user -> user.getId().toString(), Function.identity()));
    }

    private Map<String, User> loadUsersById(List<String> userIds) {
        List<UUID> ids = userIds.stream()
                .map(this::safeUuid)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(user -> user.getId().toString(), Function.identity()));
    }

    private List<String> findVisibleFriendIds(UUID requesterUuid) {
        LinkedHashSet<String> friendIds = new LinkedHashSet<>(contactRepository.findFollowingIds(requesterUuid));
        followRepository.findFollowingIdsByFollowerId(requesterUuid, Pageable.unpaged())
                .forEach(followeeId -> friendIds.add(followeeId.toString()));
        return new ArrayList<>(friendIds);
    }

    private List<PostVisibility> resolveAuthorVisibilities(String authorId, String requesterId) {
        if (authorId.equals(requesterId)) {
            return OWNER_VISIBILITIES;
        }
        boolean isFriend = findVisibleFriendIds(parseUuid(requesterId)).contains(authorId);
        return isFriend ? FRIEND_VISIBILITIES : PUBLIC_VISIBILITIES;
    }

    private boolean canView(Reel reel, String requesterId) {
        if (reel.getAuthorId().equals(requesterId)) {
            return true;
        }
        PostVisibility visibility = resolveVisibility(reel.getVisibility());
        if (visibility == PostVisibility.PUBLIC) {
            return true;
        }
        if (visibility == PostVisibility.ONLY_ME) {
            return false;
        }
        return findVisibleFriendIds(parseUuid(requesterId)).contains(reel.getAuthorId());
    }

    private List<PostReactionSummary> buildReactionSummary(Reel reel, String requesterId) {
        if (reel.getReactions() == null || reel.getReactions().isEmpty()) {
            return Collections.emptyList();
        }

        Map<ReactionType, Long> counts = reel.getReactions().stream()
                .collect(Collectors.groupingBy(PostReaction::getType, Collectors.counting()));
        ReactionType myType = findMyReactionType(reel.getReactions(), requesterId);
        return toReactionSummary(counts, myType);
    }

    private List<PostReactionSummary> buildCommentReactionSummary(PostComment comment, String requesterId) {
        if (comment.getReactions() == null || comment.getReactions().isEmpty()) {
            return Collections.emptyList();
        }

        Map<ReactionType, Long> counts = comment.getReactions().stream()
                .collect(Collectors.groupingBy(PostReaction::getType, Collectors.counting()));
        ReactionType myType = findMyReactionType(comment.getReactions(), requesterId);
        return toReactionSummary(counts, myType);
    }

    private ReactionType findMyReactionType(List<PostReaction> reactions, String requesterId) {
        if (requesterId == null) {
            return null;
        }
        return reactions.stream()
                .filter(reaction -> reaction.getUserId().equals(requesterId))
                .map(PostReaction::getType)
                .findFirst()
                .orElse(null);
    }

    private List<PostReactionSummary> toReactionSummary(Map<ReactionType, Long> counts, ReactionType myType) {
        return Arrays.stream(ReactionType.values())
                .filter(counts::containsKey)
                .map(type -> PostReactionSummary.builder()
                        .type(type)
                        .count(counts.get(type))
                        .reactedByMe(type == myType)
                        .build())
                .collect(Collectors.toList());
    }

    private PostCommentResponse toCommentResponse(PostComment comment, User user, String requesterId) {
        String displayName = user != null ? user.getDisplayName() : comment.getUserId();
        return PostCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userUsername(user != null ? user.getUsername() : null)
                .userDisplayName(displayName)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentCommentId())
                .mediaUrls(comment.getMediaUrls() != null ? comment.getMediaUrls() : List.of())
                .reactions(buildCommentReactionSummary(comment, requesterId))
                .build();
    }

    private String normalizeParentCommentId(String parentCommentId) {
        return parentCommentId != null && !parentCommentId.isBlank()
                ? parentCommentId.trim()
                : null;
    }

    private void validateCommentInput(Reel reel, String content, List<String> mediaUrls, String parentCommentId) {
        if (content.isBlank() && mediaUrls.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        if (parentCommentId != null && reel.getComments().stream().noneMatch(comment -> comment.getId().equals(parentCommentId))) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }

    private PostComment buildComment(String userId, String content, List<String> mediaUrls, String parentCommentId) {
        return PostComment.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .content(content)
                .createdAt(Instant.now())
                .parentCommentId(parentCommentId)
                .mediaUrls(mediaUrls)
                .build();
    }

    private PostComment findComment(Reel reel, String commentId) {
        return reel.getComments().stream()
                .filter(comment -> comment.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private Reel findReel(String reelId) {
        return reelRepository.findById(reelId)
                .filter(reel -> !reel.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.REEL_NOT_FOUND));
    }

    private Reel findViewableReel(String reelId, String requesterId) {
        Reel reel = findReel(reelId);
        if (!canView(reel, requesterId)) {
            throw new AppException(ErrorCode.REEL_FORBIDDEN);
        }
        return reel;
    }

    private Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Instant.now();
        }
        return Instant.parse(cursor);
    }

    private PostVisibility resolveVisibility(PostVisibility visibility) {
        return visibility != null ? visibility : PostVisibility.PUBLIC;
    }

    private String normalizeCaption(String caption) {
        String normalized = caption == null ? "" : caption.trim();
        if (normalized.length() > MAX_CAPTION_LENGTH) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        return normalized;
    }

    private UUID parseUuid(String value) {
        return UUID.fromString(value);
    }

    private Optional<UUID> safeUuid(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
