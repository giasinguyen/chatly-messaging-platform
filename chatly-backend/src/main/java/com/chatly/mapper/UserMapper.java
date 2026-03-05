package com.chatly.mapper;

import com.chatly.dto.response.UserResponse;
import com.chatly.model.postgres.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);
}
