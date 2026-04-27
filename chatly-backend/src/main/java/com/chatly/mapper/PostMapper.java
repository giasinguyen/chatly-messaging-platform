package com.chatly.mapper;

import com.chatly.dto.response.PostResponse;
import com.chatly.model.mongo.Post;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PostMapper {

    /** Reactions require aggregation logic — populated by PostService after mapping. */
    @Mapping(target = "reactions", ignore = true)
    PostResponse toResponse(Post post);
}
