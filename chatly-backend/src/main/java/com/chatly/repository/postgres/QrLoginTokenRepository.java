package com.chatly.repository.postgres;

import com.chatly.model.postgres.QrLoginToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QrLoginTokenRepository extends JpaRepository<QrLoginToken, String> {
}
