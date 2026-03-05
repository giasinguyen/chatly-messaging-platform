package com.chatly.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {

    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),

    USER_NOT_FOUND(1100, "User not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_EXISTS(1101, "User already exists", HttpStatus.CONFLICT),
    EMAIL_ALREADY_EXISTS(1102, "Email already exists", HttpStatus.CONFLICT),
    PHONE_ALREADY_EXISTS(1103, "Phone already exists", HttpStatus.CONFLICT),
    INVALID_CREDENTIALS(1104, "Invalid email or password", HttpStatus.UNAUTHORIZED),
    PASSWORD_TOO_SHORT(1105, "Password must be at least 6 characters", HttpStatus.BAD_REQUEST),

    CONTACT_NOT_FOUND(1200, "Contact not found", HttpStatus.NOT_FOUND),
    CONTACT_ALREADY_EXISTS(1201, "Contact relationship already exists", HttpStatus.CONFLICT),
    CONTACT_SELF_REQUEST(1202, "Cannot add yourself as a contact", HttpStatus.BAD_REQUEST),

    CONVERSATION_NOT_FOUND(1300, "Conversation not found", HttpStatus.NOT_FOUND),
    CONVERSATION_ALREADY_EXISTS(1301, "Private conversation already exists", HttpStatus.CONFLICT),
    CONVERSATION_INVALID_PARTICIPANTS(1302, "Private conversation requires exactly 2 participants", HttpStatus.BAD_REQUEST),
    NOT_CONVERSATION_PARTICIPANT(1303, "You are not a participant of this conversation", HttpStatus.FORBIDDEN),

    MESSAGE_NOT_FOUND(1400, "Message not found", HttpStatus.NOT_FOUND),

    GROUP_MEMBER_NOT_FOUND(1500, "Group member not found", HttpStatus.NOT_FOUND),
    GROUP_MEMBER_ALREADY_EXISTS(1501, "User is already a member of this group", HttpStatus.CONFLICT),
    GROUP_PERMISSION_DENIED(1502, "You do not have permission for this action", HttpStatus.FORBIDDEN),

    UNAUTHORIZED(1600, "You do not have permission", HttpStatus.FORBIDDEN),
    UNAUTHENTICATED(1601, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    INVALID_TOKEN(1602, "Invalid or expired token", HttpStatus.UNAUTHORIZED);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
