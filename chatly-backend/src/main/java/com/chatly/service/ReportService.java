package com.chatly.service;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.response.ReportResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostReportMapper;
import com.chatly.model.enums.ReportStatus;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReport;
import com.chatly.repository.mongo.PostReportRepository;
import com.chatly.repository.mongo.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final PostRepository postRepository;
    private final PostReportRepository postReportRepository;
    private final PostReportMapper postReportMapper;

    @Transactional
    public ReportResponse createPostReport(String reporterId, CreateReportRequest request) {
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_FOUND));

        if (postReportRepository.existsByReporterIdAndPostId(reporterId, request.getPostId())) {
            throw new AppException(ErrorCode.REPORT_ALREADY_EXISTS);
        }

        PostReport report = postReportMapper.toEntity(request);
        report.setReporterId(reporterId);
        report.setReportedUserId(post.getAuthorId());
        report.setStatus(ReportStatus.PENDING);

        PostReport saved = postReportRepository.save(report);
        log.info("Post report created: id={}, postId={}, reporterId={}", saved.getId(), saved.getPostId(), reporterId);

        return postReportMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> listReports(ReportStatus status, Pageable pageable) {
        Page<PostReport> reports = (status != null)
                ? postReportRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : postReportRepository.findAllByOrderByCreatedAtDesc(pageable);

        return reports.map(postReportMapper::toResponse);
    }

    @Transactional
    public ReportResponse updateReportStatus(String id, ReportStatus status) {
        PostReport report = postReportRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        report.setStatus(status);
        PostReport saved = postReportRepository.save(report);
        log.info("Report status updated: id={}, status={}", saved.getId(), status);
        return postReportMapper.toResponse(saved);
    }
}
