package com.chatly.mapper;

import com.chatly.dto.response.PostResponse;
import com.chatly.model.mongo.Post;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PostMapper {

    /** Reactions require aggregation logic — populated by PostService after mapping. */
    @Mapping(target = "reactions", ignore = true)
    @Mapping(target = "authorUsername", ignore = true)
    @Mapping(target = "authorDisplayName", ignore = true)
    @Mapping(target = "authorAvatarUrl", ignore = true)
    @Mapping(target = "savedByMe", ignore = true)
    PostResponse toResponse(Post post);
}
