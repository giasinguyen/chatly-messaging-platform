package com.chatly.service;

import com.chatly.dto.request.CreatePostRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.request.UpdatePostRequest;
import com.chatly.dto.response.PostResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReaction;
import com.chatly.model.mongo.SavedPost;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.SavedPostRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostMapper postMapper;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SavedPostRepository savedPostRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private PostService postService;

    private static final String AUTHOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String OTHER_ID = "22222222-2222-2222-2222-222222222222";
    private static final String POST_ID = "post-abc";

    private Post samplePost;

    @BeforeEach
    void setUp() {
        samplePost = Post.builder()
                .id(POST_ID)
                .authorId(AUTHOR_ID)
                .content("Hello #world")
                .visibility(PostVisibility.PUBLIC)
                .mediaUrls(new ArrayList<>(List.of("https://cdn.example.com/photo.jpg")))
                .hashtags(new ArrayList<>())
                .reactions(new ArrayList<>())
                .build();
        lenient().when(userRepository.findById(any())).thenReturn(Optional.empty());
        lenient().when(savedPostRepository.existsByUserIdAndPostId(anyString(), anyString())).thenReturn(false);
        lenient().when(followRepository.findFollowerIdsByFolloweeId(any(), any(Pageable.class)))
                .thenReturn(Page.empty());
        lenient().when(contactRepository.findFollowingIds(any())).thenReturn(List.of());
    }

    @Test
    void create_validRequest_shouldSaveAndReturnResponse() {
        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Hello #world");
        request.setVisibility(PostVisibility.PUBLIC);
        request.setMediaUrls(List.of("https://cdn.example.com/photo.jpg"));

        when(postRepository.save(any(Post.class))).thenReturn(samplePost);
        PostResponse mockResponse = new PostResponse();
        mockResponse.setId(POST_ID);
        when(postMapper.toResponse(any(Post.class))).thenReturn(mockResponse);

        PostResponse result = postService.create(AUTHOR_ID, request);

        assertThat(result.getId()).isEqualTo(POST_ID);
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void create_shouldExtractHashtagsFromContent() {
        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Check #spring and #java");
        request.setMediaUrls(List.of("https://cdn.example.com/photo.jpg"));

        Post saved = Post.builder()
                .id(POST_ID).authorId(AUTHOR_ID)
                .content("Check #spring and #java")
                .hashtags(List.of("spring", "java"))
                .reactions(new ArrayList<>()).mediaUrls(new ArrayList<>(List.of("https://cdn.example.com/photo.jpg")))
                .build();

        when(postRepository.save(any())).thenReturn(saved);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.create(AUTHOR_ID, request);

        verify(postRepository).save(argThat(p ->
                p.getHashtags().containsAll(List.of("spring", "java"))
        ));
    }

    @Test
    void create_defaultsToPublicWhenVisibilityNull() {
        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Visible to all");
        request.setVisibility(null);
        request.setMediaUrls(List.of("https://cdn.example.com/photo.jpg"));

        when(postRepository.save(any())).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.create(AUTHOR_ID, request);

        verify(postRepository).save(argThat(p -> p.getVisibility() == PostVisibility.PUBLIC));
    }

    @Test
    void create_publicPost_shouldBroadcastToFollowers() {
        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Hello #world");
        request.setVisibility(PostVisibility.PUBLIC);
        request.setMediaUrls(List.of("https://cdn.example.com/photo.jpg"));

        when(postRepository.save(any(Post.class))).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());
        when(followRepository.findFollowerIdsByFolloweeId(eq(UUID.fromString(AUTHOR_ID)), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(UUID.fromString(OTHER_ID))));
        when(contactRepository.findFollowingIds(UUID.fromString(AUTHOR_ID))).thenReturn(List.of(OTHER_ID));

        postService.create(AUTHOR_ID, request);

        verify(messagingTemplate).convertAndSend(eq("/topic/feed/" + OTHER_ID), any(PostResponse.class));
    }

    @Test
    void create_onlyMePost_shouldNotBroadcast() {
        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Private #world");
        request.setVisibility(PostVisibility.ONLY_ME);
        request.setMediaUrls(List.of("https://cdn.example.com/photo.jpg"));
        samplePost.setVisibility(PostVisibility.ONLY_ME);

        when(postRepository.save(any(Post.class))).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.create(AUTHOR_ID, request);

        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void getById_existingPost_shouldReturnResponse() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(postMapper.toResponse(samplePost)).thenReturn(new PostResponse());

        PostResponse result = postService.getById(POST_ID, AUTHOR_ID);

        assertThat(result).isNotNull();
    }

    @Test
    void getById_notFound_shouldThrowPostNotFound() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.getById(POST_ID, AUTHOR_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.POST_NOT_FOUND);
    }

    @Test
    void getSaved_shouldReturnExistingSavedPosts() {
        SavedPost savedPost = SavedPost.builder()
                .userId(AUTHOR_ID)
                .postId(POST_ID)
                .build();

        when(savedPostRepository.findByUserIdOrderByCreatedAtDesc(AUTHOR_ID)).thenReturn(List.of(savedPost));
        when(postRepository.findAllById(List.of(POST_ID))).thenReturn(List.of(samplePost));
        when(postMapper.toResponse(samplePost)).thenReturn(new PostResponse());
        when(savedPostRepository.existsByUserIdAndPostId(AUTHOR_ID, POST_ID)).thenReturn(true);

        Page<PostResponse> result = postService.getSaved(AUTHOR_ID, Pageable.unpaged());

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getSaved_shouldCleanupMissingSavedPosts() {
        SavedPost savedPost = SavedPost.builder()
                .userId(AUTHOR_ID)
                .postId(POST_ID)
                .build();

        when(savedPostRepository.findByUserIdOrderByCreatedAtDesc(AUTHOR_ID)).thenReturn(List.of(savedPost));
        when(postRepository.findAllById(List.of(POST_ID))).thenReturn(List.of());

        Page<PostResponse> result = postService.getSaved(AUTHOR_ID, Pageable.unpaged());

        assertThat(result.getContent()).isEmpty();
        verify(savedPostRepository).deleteByUserIdAndPostId(AUTHOR_ID, POST_ID);
    }

    @Test
    void update_asOwner_shouldPersistChanges() {
        UpdatePostRequest request = new UpdatePostRequest();
        request.setContent("Updated #content");
        request.setVisibility(PostVisibility.ONLY_ME);

        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(postRepository.save(any())).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.update(POST_ID, AUTHOR_ID, request);

        verify(postRepository).save(argThat(p ->
                p.getContent().equals("Updated #content") &&
                p.getVisibility() == PostVisibility.ONLY_ME
        ));
    }

    @Test
    void update_asNonOwner_shouldThrowForbidden() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));

        assertThatThrownBy(() -> postService.update(POST_ID, OTHER_ID, new UpdatePostRequest()))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.POST_FORBIDDEN);
    }

    @Test
    void delete_asOwner_shouldCallRepositoryDelete() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));

        postService.delete(POST_ID, AUTHOR_ID);

        verify(postRepository).delete(samplePost);
    }

    @Test
    void delete_asNonOwner_shouldThrowForbidden() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));

        assertThatThrownBy(() -> postService.delete(POST_ID, OTHER_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.POST_FORBIDDEN);
    }

    @Test
    void react_shouldAddReactionAndReplaceExisting() {
        ReactToPostRequest request = new ReactToPostRequest();
        request.setType(ReactionType.LOVE);

        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(postRepository.save(any())).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.react(POST_ID, AUTHOR_ID, request);

        verify(postRepository).save(argThat(p ->
                p.getReactions().stream().anyMatch(r ->
                        r.getUserId().equals(AUTHOR_ID) && r.getType() == ReactionType.LOVE)
        ));
    }

    @Test
    void removeReaction_shouldRemoveUserReaction() {
        samplePost.getReactions().add(
                PostReaction.builder().userId(AUTHOR_ID).type(ReactionType.LIKE).build()
        );

        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(postRepository.save(any())).thenReturn(samplePost);
        when(postMapper.toResponse(any())).thenReturn(new PostResponse());

        postService.removeReaction(POST_ID, AUTHOR_ID);

        verify(postRepository).save(argThat(p ->
                p.getReactions().stream().noneMatch(r -> r.getUserId().equals(AUTHOR_ID))
        ));
    }

    @Test
    void save_whenNotSaved_shouldCreateSavedPost() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(savedPostRepository.existsByUserIdAndPostId(AUTHOR_ID, POST_ID)).thenReturn(false);

        postService.save(POST_ID, AUTHOR_ID);

        verify(savedPostRepository).save(argThat(saved ->
                saved.getUserId().equals(AUTHOR_ID) && saved.getPostId().equals(POST_ID)
        ));
    }

    @Test
    void save_whenAlreadySaved_shouldSkipCreate() {
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(samplePost));
        when(savedPostRepository.existsByUserIdAndPostId(AUTHOR_ID, POST_ID)).thenReturn(true);

        postService.save(POST_ID, AUTHOR_ID);

        verify(savedPostRepository, never()).save(any(SavedPost.class));
    }

    @Test
    void unsave_shouldDeleteSavedPost() {
        postService.unsave(POST_ID, AUTHOR_ID);

        verify(savedPostRepository).deleteByUserIdAndPostId(AUTHOR_ID, POST_ID);
    }
}
