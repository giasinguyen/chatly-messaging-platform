package com.chatly.mapper;

import com.chatly.dto.response.MessageResponse;
import com.chatly.model.mongo.Message;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MessageMapper {

    MessageResponse toResponse(Message message);
}
