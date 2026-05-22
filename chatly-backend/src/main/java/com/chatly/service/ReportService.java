package com.chatly.service;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.request.CreateUserReportRequest;
import com.chatly.dto.response.ReportResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostReportMapper;
import com.chatly.mapper.UserReportMapper;
import com.chatly.model.enums.ReportStatus;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReport;
import com.chatly.model.mongo.UserReport;
import com.chatly.repository.mongo.PostReportRepository;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.UserReportRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final PostRepository postRepository;
    private final PostReportRepository postReportRepository;
    private final PostReportMapper postReportMapper;
    private final UserReportRepository userReportRepository;
    private final UserReportMapper userReportMapper;
    private final UserRepository userRepository;

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

    @Transactional
    public ReportResponse createUserReport(String reporterId, CreateUserReportRequest request) {
        UUID reportedUserId = parseUserId(request.getReportedUserId());
        if (!userRepository.existsById(reportedUserId)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        if (userReportRepository.existsByReporterIdAndReportedUserId(reporterId, request.getReportedUserId())) {
            throw new AppException(ErrorCode.USER_REPORT_ALREADY_EXISTS);
        }

        UserReport report = userReportMapper.toEntity(request);
        report.setReporterId(reporterId);
        report.setStatus(ReportStatus.PENDING);
        UserReport saved = userReportRepository.save(report);
        log.info("User report created: id={}, reportedUserId={}, reporterId={}",
                saved.getId(), saved.getReportedUserId(), reporterId);
        return userReportMapper.toResponse(saved);
    }

    private UUID parseUserId(String userId) {
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> listReports(ReportStatus status, Pageable pageable) {
        Page<PostReport> reports = (status != null)
                ? postReportRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : postReportRepository.findAllByOrderByCreatedAtDesc(pageable);

        return reports.map(postReportMapper::toResponse);
    }
}
