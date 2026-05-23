package com.chatly.model.mongo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "close_friends")
@CompoundIndexes({
        @CompoundIndex(name = "owner_friend_unique", def = "{'ownerId': 1, 'friendId': 1}", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloseFriend {

    @Id
    private String id;

    @Indexed
    private String ownerId;

    @Indexed
    private String friendId;

    @CreatedDate
    private Instant createdAt;
}
