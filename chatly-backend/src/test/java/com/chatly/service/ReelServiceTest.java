package com.chatly.service;

import com.chatly.dto.request.CreateReelRequest;
import com.chatly.dto.request.CreatePostCommentRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.response.ReelResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ReelMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.FileMetadata;
import com.chatly.model.mongo.Reel;
import com.chatly.repository.mongo.FileMetadataRepository;
import com.chatly.repository.mongo.ReelRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.storage.StorageProvider;
import com.chatly.storage.UploadResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReelServiceTest {

    private static final String AUTHOR_ID = "11111111-1111-1111-1111-111111111111";
    private static final String REEL_ID = "reel-abc";

    @Mock
    private ReelRepository reelRepository;

    @Mock
    private ReelMapper reelMapper;

    @Mock
    private StorageProvider storageProvider;

    @Mock
    private FileMetadataRepository fileMetadataRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReelService reelService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reelService, "maxVideoSizeMb", 20L);
        lenient().when(userRepository.findAllById(any())).thenReturn(List.of());
    }

    @Test
    void create_validVideo_shouldUploadAndReturnResponse() {
        MockMultipartFile video = new MockMultipartFile(
                "video",
                "reel.mp4",
                "video/mp4",
                "video-content".getBytes()
        );
        CreateReelRequest request = CreateReelRequest.builder()
                .caption("A first reel")
                .visibility(PostVisibility.FRIENDS_ONLY)
                .build();
        Reel savedReel = Reel.builder()
                .id(REEL_ID)
                .authorId(AUTHOR_ID)
                .caption("A first reel")
                .videoUrl("https://cdn.example.com/reels/reel.mp4")
                .visibility(PostVisibility.FRIENDS_ONLY)
                .build();
        ReelResponse mappedResponse = ReelResponse.builder().id(REEL_ID).build();

        when(storageProvider.upload(video, "reels"))
                .thenReturn(new UploadResult(savedReel.getVideoUrl(), "reels/reel.mp4", "local"));
        when(fileMetadataRepository.save(any(FileMetadata.class)))
                .thenReturn(FileMetadata.builder().id("file-1").build());
        when(reelRepository.save(any(Reel.class))).thenReturn(savedReel);
        when(reelMapper.toResponse(savedReel)).thenReturn(mappedResponse);
        ReelResponse result = reelService.create(AUTHOR_ID, request, video);

        assertThat(result.getId()).isEqualTo(REEL_ID);
        verify(reelRepository).save(argThat(reel ->
                reel.getVisibility() == PostVisibility.FRIENDS_ONLY
                        && reel.getCaption().equals("A first reel")
                        && reel.getFileId().equals("file-1")
        ));
    }

    @Test
    void create_oversizedVideo_shouldThrowFileSizeExceeded() {
        ReflectionTestUtils.setField(reelService, "maxVideoSizeMb", 0L);
        MockMultipartFile video = new MockMultipartFile(
                "video",
                "reel.mp4",
                "video/mp4",
                "video-content".getBytes()
        );

        assertThatThrownBy(() -> reelService.create(AUTHOR_ID, CreateReelRequest.builder().build(), video))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.FILE_SIZE_EXCEEDED);

        verifyNoInteractions(storageProvider, reelRepository);
    }

    @Test
    void react_shouldSaveLikeAndReturnSummary() {
        Reel reel = sampleReel();
        ReactToPostRequest request = new ReactToPostRequest();
        request.setType(ReactionType.LIKE);

        when(reelRepository.findById(REEL_ID)).thenReturn(Optional.of(reel));
        when(reelRepository.save(any(Reel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reelMapper.toResponse(any(Reel.class))).thenReturn(ReelResponse.builder().id(REEL_ID).build());

        ReelResponse result = reelService.react(REEL_ID, AUTHOR_ID, request);

        assertThat(result.getReactions()).hasSize(1);
        assertThat(result.getReactions().get(0).isReactedByMe()).isTrue();
        verify(reelRepository).save(argThat(saved -> saved.getReactions().size() == 1));
    }

    @Test
    void share_shouldIncrementShareCount() {
        Reel reel = sampleReel();

        when(reelRepository.findById(REEL_ID)).thenReturn(Optional.of(reel));
        when(reelRepository.save(any(Reel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reelMapper.toResponse(any(Reel.class))).thenAnswer(invocation -> {
            Reel saved = invocation.getArgument(0);
            return ReelResponse.builder().id(saved.getId()).shareCount(saved.getShareCount()).build();
        });

        ReelResponse result = reelService.share(REEL_ID, AUTHOR_ID);

        assertThat(result.getShareCount()).isEqualTo(1);
        verify(reelRepository).save(argThat(saved -> saved.getShareCount() == 1));
    }

    @Test
    void addComment_shouldAppendCommentAndIncrementCount() {
        Reel reel = sampleReel();
        CreatePostCommentRequest request = new CreatePostCommentRequest();
        request.setContent("Nice reel");

        when(reelRepository.findById(REEL_ID)).thenReturn(Optional.of(reel));
        when(reelRepository.save(any(Reel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        var result = reelService.addComment(REEL_ID, AUTHOR_ID, request);

        assertThat(result.getContent()).isEqualTo("Nice reel");
        verify(reelRepository).save(argThat(saved ->
                saved.getCommentCount() == 1 && saved.getComments().size() == 1
        ));
    }

    @Test
    void reactToComment_shouldAddCommentReaction() {
        Reel reel = sampleReel();
        reel.getComments().add(com.chatly.model.mongo.PostComment.builder()
                .id("comment-1")
                .userId(AUTHOR_ID)
                .content("Nice reel")
                .build());
        ReactToPostRequest request = new ReactToPostRequest();
        request.setType(ReactionType.LIKE);

        when(reelRepository.findById(REEL_ID)).thenReturn(Optional.of(reel));
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        var result = reelService.reactToComment(REEL_ID, "comment-1", AUTHOR_ID, request);

        assertThat(result.getReactions()).hasSize(1);
        assertThat(result.getReactions().get(0).isReactedByMe()).isTrue();
        verify(reelRepository).save(reel);
    }

    private Reel sampleReel() {
        return Reel.builder()
                .id(REEL_ID)
                .authorId(AUTHOR_ID)
                .caption("A first reel")
                .videoUrl("https://cdn.example.com/reels/reel.mp4")
                .visibility(PostVisibility.PUBLIC)
                .reactions(new ArrayList<>())
                .comments(new ArrayList<>())
                .build();
    }
}
