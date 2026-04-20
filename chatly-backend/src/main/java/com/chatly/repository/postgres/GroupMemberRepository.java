package com.chatly.repository.postgres;

import com.chatly.model.enums.GroupRole;
import com.chatly.model.postgres.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    List<GroupMember> findByConversationId(String conversationId);

    List<GroupMember> findByUserId(UUID userId);

    Optional<GroupMember> findByConversationIdAndUserId(String conversationId, UUID userId);

    boolean existsByConversationIdAndUserId(String conversationId, UUID userId);

    void deleteByConversationIdAndUserId(String conversationId, UUID userId);

    List<GroupMember> findByConversationIdAndRoleIn(String conversationId, List<GroupRole> roles);

    List<GroupMember> findByConversationIdAndRoleInOrderByJoinedAtAsc(String conversationId, List<GroupRole> roles);

    List<GroupMember> findByConversationIdOrderByJoinedAtAsc(String conversationId);
}
