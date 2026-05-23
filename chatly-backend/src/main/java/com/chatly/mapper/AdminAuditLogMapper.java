package com.chatly.mapper;

import com.chatly.dto.response.AdminAuditLogResponse;
import com.chatly.model.mongo.AdminAuditLog;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AdminAuditLogMapper {

    AdminAuditLogResponse toResponse(AdminAuditLog auditLog);
}
