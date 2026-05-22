package com.chatly.mapper;

import com.chatly.dto.response.AdminSettingsResponse;
import com.chatly.model.mongo.AdminSettings;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AdminSettingsMapper {

    AdminSettingsResponse toResponse(AdminSettings settings);
}
