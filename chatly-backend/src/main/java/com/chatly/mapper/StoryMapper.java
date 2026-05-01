package com.chatly.mapper;

import com.chatly.dto.response.StoryResponse;
import com.chatly.model.mongo.Story;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StoryMapper {
    StoryResponse toResponse(Story story);
}
