package com.chatly.mapper;

import com.chatly.dto.response.ConversationResponse;
import com.chatly.model.mongo.Conversation;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ConversationMapper {

    ConversationResponse toResponse(Conversation conversation);
}
