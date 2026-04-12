package com.chatly.dto.session;

import com.chatly.model.postgres.UserLoginSession;

/**
 * Result of creating a login session; {@code replacedSession} is set when a prior session on the same platform was revoked.
 */
public record StartLoginSessionResult(UserLoginSession session, UserLoginSession replacedSession) {
}
