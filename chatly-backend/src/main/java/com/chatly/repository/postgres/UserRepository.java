package com.chatly.repository.postgres;

import com.chatly.model.postgres.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
}
