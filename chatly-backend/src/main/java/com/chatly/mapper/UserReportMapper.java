package com.chatly.mapper;

import com.chatly.dto.request.CreateUserReportRequest;
import com.chatly.dto.response.ReportResponse;
import com.chatly.model.mongo.UserReport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserReportMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "reporterId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    UserReport toEntity(CreateUserReportRequest request);

    @Mapping(target = "postId", ignore = true)
    ReportResponse toResponse(UserReport report);
}
