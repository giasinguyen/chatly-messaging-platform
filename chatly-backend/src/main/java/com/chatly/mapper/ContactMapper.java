package com.chatly.mapper;

import com.chatly.dto.response.ContactResponse;
import com.chatly.model.postgres.Contact;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = UserMapper.class)
public interface ContactMapper {

    ContactResponse toResponse(Contact contact);
}
