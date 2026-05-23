package com.chatly.mapper;

import com.chatly.dto.response.ReelResponse;
import com.chatly.model.mongo.Reel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReelMapper {

    @Mapping(target = "authorUsername", ignore = true)
    @Mapping(target = "authorDisplayName", ignore = true)
    @Mapping(target = "authorAvatarUrl", ignore = true)
    @Mapping(target = "reactions", ignore = true)
    ReelResponse toResponse(Reel reel);
}
