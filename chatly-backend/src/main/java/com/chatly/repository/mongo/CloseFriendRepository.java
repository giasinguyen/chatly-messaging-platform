package com.chatly.repository.mongo;

import com.chatly.model.mongo.CloseFriend;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CloseFriendRepository extends MongoRepository<CloseFriend, String> {

    boolean existsByOwnerIdAndFriendId(String ownerId, String friendId);
}
