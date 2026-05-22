package com.chatly.service;

import com.chatly.dto.request.CreateReelRequest;
import com.chatly.dto.response.ReelResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ReelMapper;
import com.chatly.model.enums.PostVisibility;
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

import java.util.List;

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
        when(userRepository.findAllById(any())).thenReturn(List.of());

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
}
