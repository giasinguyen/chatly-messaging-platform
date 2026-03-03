package com.chatly.repository.postgres;

import com.chatly.model.postgres.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
}
