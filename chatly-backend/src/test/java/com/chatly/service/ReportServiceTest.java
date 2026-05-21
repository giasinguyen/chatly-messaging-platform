package com.chatly.service;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.response.ReportResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostReportMapper;
import com.chatly.model.enums.ReportReason;
import com.chatly.model.enums.ReportStatus;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReport;
import com.chatly.repository.mongo.PostReportRepository;
import com.chatly.repository.mongo.PostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    private static final String POST_ID = "post-123";
    private static final String REPORTER_ID = "reporter-123";
    private static final String REPORTED_USER_ID = "author-123";

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostReportRepository postReportRepository;

    @Mock
    private PostReportMapper postReportMapper;

    @InjectMocks
    private ReportService reportService;

    @Test
    void createPostReport_shouldPersistReport_whenPostExists() {
        CreateReportRequest request = createRequest();
        Post post = Post.builder()
                .id(POST_ID)
                .authorId(REPORTED_USER_ID)
                .build();
        PostReport report = PostReport.builder()
                .postId(POST_ID)
                .reason(ReportReason.SPAM)
                .description("Suspicious content")
                .build();
        PostReport saved = PostReport.builder()
                .id("report-123")
                .postId(POST_ID)
                .reporterId(REPORTER_ID)
                .reportedUserId(REPORTED_USER_ID)
                .reason(ReportReason.SPAM)
                .description("Suspicious content")
                .status(ReportStatus.PENDING)
                .build();
        ReportResponse response = ReportResponse.builder()
                .id("report-123")
                .postId(POST_ID)
                .reporterId(REPORTER_ID)
                .reportedUserId(REPORTED_USER_ID)
                .reason(ReportReason.SPAM)
                .description("Suspicious content")
                .status(ReportStatus.PENDING)
                .build();

        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(post));
        when(postReportMapper.toEntity(request)).thenReturn(report);
        when(postReportRepository.save(any(PostReport.class))).thenReturn(saved);
        when(postReportMapper.toResponse(saved)).thenReturn(response);

        ReportResponse result = reportService.createPostReport(REPORTER_ID, request);

        assertThat(result.getId()).isEqualTo("report-123");
        verify(postReportRepository).save(any(PostReport.class));
        assertThat(report.getReporterId()).isEqualTo(REPORTER_ID);
        assertThat(report.getReportedUserId()).isEqualTo(REPORTED_USER_ID);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PENDING);
    }

    @Test
    void createPostReport_shouldThrowPostNotFound_whenPostMissing() {
        CreateReportRequest request = createRequest();
        when(postRepository.findById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.createPostReport(REPORTER_ID, request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.POST_NOT_FOUND);
    }

    private CreateReportRequest createRequest() {
        CreateReportRequest request = new CreateReportRequest();
        request.setPostId(POST_ID);
        request.setReason(ReportReason.SPAM);
        request.setDescription("Suspicious content");
        return request;
    }
}
