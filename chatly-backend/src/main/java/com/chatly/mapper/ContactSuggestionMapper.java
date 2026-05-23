package com.chatly.mapper;

import com.chatly.dto.response.ContactSuggestionResponse;
import com.chatly.model.postgres.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ContactSuggestionMapper {

    @Mapping(target = "id", source = "user.id")
    ContactSuggestionResponse toResponse(User user, int mutualFriendCount);
}
