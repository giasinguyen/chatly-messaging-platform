package com.chatly.mapper;

import com.chatly.dto.response.NotificationResponse;
import com.chatly.model.mongo.Notification;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    NotificationResponse toResponse(Notification notification);
}
