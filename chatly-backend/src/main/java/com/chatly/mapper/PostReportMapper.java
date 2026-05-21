package com.chatly.mapper;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.response.ReportResponse;
import com.chatly.model.mongo.PostReport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PostReportMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "reporterId", ignore = true)
    @Mapping(target = "reportedUserId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    PostReport toEntity(CreateReportRequest request);

    ReportResponse toResponse(PostReport report);
}
