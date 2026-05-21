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
    USERNAME_ALREADY_EXISTS(1106, "Username already exists", HttpStatus.CONFLICT),
    INVALID_CREDENTIALS(1104, "Invalid username, email, phone or password", HttpStatus.UNAUTHORIZED),
    PASSWORD_TOO_SHORT(1105, "Password must be at least 6 characters", HttpStatus.BAD_REQUEST),
    INVALID_USERNAME_FORMAT(1113, "Username can only contain letters and numbers", HttpStatus.BAD_REQUEST),
    INVALID_DISPLAY_NAME_FORMAT(1114, "Display name can only contain letters and numbers", HttpStatus.BAD_REQUEST),
    CURRENT_PASSWORD_INCORRECT(1111, "Current password is incorrect", HttpStatus.BAD_REQUEST),
    PASSWORD_CONFIRM_MISMATCH(1112, "Confirm password does not match", HttpStatus.BAD_REQUEST),
    EMAIL_REQUIRED(1107, "Email is required for registration", HttpStatus.BAD_REQUEST),
    EMAIL_NOT_VERIFIED(1108, "Email is not verified", HttpStatus.FORBIDDEN),
    EMAIL_VERIFICATION_TOKEN_INVALID(1109, "Invalid or expired email verification link", HttpStatus.BAD_REQUEST),
    EMAIL_VERIFICATION_RESEND_TOO_SOON(1110, "Please wait before requesting another verification link", HttpStatus.TOO_MANY_REQUESTS),

    CONTACT_NOT_FOUND(1200, "Contact not found", HttpStatus.NOT_FOUND),
    CONTACT_ALREADY_EXISTS(1201, "Contact relationship already exists", HttpStatus.CONFLICT),
    CONTACT_SELF_REQUEST(1202, "Cannot add yourself as a contact", HttpStatus.BAD_REQUEST),
    CONTACT_NOT_AUTHORIZED(1203, "You are not authorized to perform this action on this contact", HttpStatus.FORBIDDEN),
    CONTACT_BLOCKED(1204, "Action blocked due to contact restriction", HttpStatus.FORBIDDEN),

    CONVERSATION_NOT_FOUND(1300, "Conversation not found", HttpStatus.NOT_FOUND),
    CONVERSATION_ALREADY_EXISTS(1301, "Private conversation already exists", HttpStatus.CONFLICT),
    CONVERSATION_INVALID_PARTICIPANTS(1302, "Private conversation requires exactly 2 participants",
            HttpStatus.BAD_REQUEST),
    NOT_CONVERSATION_PARTICIPANT(1303, "You are not a participant of this conversation", HttpStatus.FORBIDDEN),
    CONVERSATION_PIN_LIMIT(1304, "You can pin a maximum of 5 conversations", HttpStatus.BAD_REQUEST),
    CONVERSATION_ALREADY_PINNED(1305, "Conversation is already pinned", HttpStatus.CONFLICT),
    CONVERSATION_NOT_PINNED(1306, "Conversation is not pinned", HttpStatus.BAD_REQUEST),
    CONVERSATION_ALREADY_MUTED(1307, "Conversation is already muted", HttpStatus.CONFLICT),
    CONVERSATION_NOT_MUTED(1308, "Conversation is not muted", HttpStatus.BAD_REQUEST),

    MESSAGE_NOT_FOUND(1400, "Message not found", HttpStatus.NOT_FOUND),
    MESSAGE_ALREADY_RECALLED(1401, "Message has already been recalled", HttpStatus.CONFLICT),
    CANNOT_RECALL_OTHERS_MESSAGE(1402, "You can only recall your own messages", HttpStatus.FORBIDDEN),
    RECALL_TIME_EXCEEDED(1403, "Recall time limit (24 hours) has been exceeded", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_EDIT_OTHERS_MESSAGE(1404, "You can only edit your own messages", HttpStatus.FORBIDDEN),
    EDIT_TIME_EXCEEDED(1405, "Edit time limit (15 minutes) has been exceeded", HttpStatus.UNPROCESSABLE_ENTITY),
    CANNOT_EDIT_NON_TEXT(1406, "Only text messages can be edited", HttpStatus.BAD_REQUEST),
    CANNOT_RECALL_SYSTEM_MESSAGE(1407, "System messages cannot be recalled", HttpStatus.BAD_REQUEST),
    INVALID_EMOJI(1408, "Emoji is not in the allowed list", HttpStatus.BAD_REQUEST),
    CANNOT_REACT_RECALLED_MESSAGE(1409, "Cannot react to a recalled message", HttpStatus.BAD_REQUEST),
    INVALID_FORWARD_TARGETS(1410, "Please select at least one valid target conversation", HttpStatus.BAD_REQUEST),
    CANNOT_FORWARD_MESSAGE_TYPE(1411, "Only text, image and file messages can be forwarded", HttpStatus.BAD_REQUEST),
    CANNOT_FORWARD_RECALLED_MESSAGE(1412, "Recalled messages cannot be forwarded", HttpStatus.BAD_REQUEST),
    POLL_NOT_FOUND(1410, "Poll not found in this message", HttpStatus.BAD_REQUEST),
    POLL_INVALID_OPTION(1411, "Invalid poll option index", HttpStatus.BAD_REQUEST),

    GROUP_MEMBER_NOT_FOUND(1500, "Group member not found", HttpStatus.NOT_FOUND),
    GROUP_MEMBER_ALREADY_EXISTS(1501, "User is already a member of this group", HttpStatus.CONFLICT),
    GROUP_PERMISSION_DENIED(1502, "You do not have permission for this action", HttpStatus.FORBIDDEN),
    GROUP_INVITE_TOKEN_INVALID(1503, "Invalid or expired invite link", HttpStatus.BAD_REQUEST),
    GROUP_PENDING_REQUEST_EXISTS(1504, "A pending join request already exists", HttpStatus.CONFLICT),
    GROUP_PENDING_REQUEST_NOT_FOUND(1505, "Pending join request not found", HttpStatus.NOT_FOUND),
    GROUP_REMINDER_NOT_FOUND(1506, "Reminder not found", HttpStatus.NOT_FOUND),
    GROUP_NOTE_NOT_FOUND(1507, "Note not found", HttpStatus.NOT_FOUND),
    REMINDER_TIME_IN_PAST(1508, "Reminder time must be in the future", HttpStatus.BAD_REQUEST),

    NOTIFICATION_NOT_FOUND(1700, "Notification not found", HttpStatus.NOT_FOUND),

    POST_NOT_FOUND(1900, "Post not found", HttpStatus.NOT_FOUND),
    POST_FORBIDDEN(1901, "You are not authorized to modify this post", HttpStatus.FORBIDDEN),
    POST_IMAGE_REQUIRED(1902, "Post must include at least one image", HttpStatus.BAD_REQUEST),
    COMMENT_NOT_FOUND(1903, "Comment not found", HttpStatus.NOT_FOUND),
    COMMENT_FORBIDDEN(1904, "You are not authorized to modify this comment", HttpStatus.FORBIDDEN),
    REPORT_ALREADY_EXISTS(1905, "You have already reported this post", HttpStatus.CONFLICT),
    STORY_NOT_FOUND(1910, "Story not found", HttpStatus.NOT_FOUND),
    STORY_FORBIDDEN(1911, "You are not authorized to perform this action on this story", HttpStatus.FORBIDDEN),

    FILE_NOT_FOUND(1800, "File not found", HttpStatus.NOT_FOUND),
    FILE_UPLOAD_FAILED(1801, "File upload failed", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_TYPE_NOT_ALLOWED(1802, "File type is not allowed", HttpStatus.UNSUPPORTED_MEDIA_TYPE),
    FILE_SIZE_EXCEEDED(1803, "File size exceeds the maximum allowed limit", HttpStatus.PAYLOAD_TOO_LARGE),
    FILE_DELETE_DENIED(1804, "You do not have permission to delete this file", HttpStatus.FORBIDDEN),

    UNAUTHORIZED(1600, "You do not have permission", HttpStatus.FORBIDDEN),
    UNAUTHENTICATED(1601, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    INVALID_TOKEN(1602, "Invalid or expired token", HttpStatus.UNAUTHORIZED),
    SESSION_NOT_FOUND(1603, "Session not found", HttpStatus.NOT_FOUND),

    AGENT_SERVICE_ERROR(2000, "AI service temporarily unavailable", HttpStatus.BAD_GATEWAY),
    AGENT_BAD_REQUEST(2001, "Invalid AI service request", HttpStatus.BAD_REQUEST),

    SETTINGS_INVALID_SECTION(2100, "Invalid settings section. Allowed: privacy, notifications, messages", HttpStatus.BAD_REQUEST),

    ALREADY_FOLLOWING(2202, "You are already following this user", HttpStatus.CONFLICT),
    NOT_FOLLOWING(2203, "You are not following this user", HttpStatus.NOT_FOUND),
    CANNOT_FOLLOW_SELF(2207, "You cannot follow yourself", HttpStatus.BAD_REQUEST),
    FOLLOW_ACTION_BLOCKED(2208, "Follow action is blocked due to privacy restrictions", HttpStatus.FORBIDDEN),
    FRIEND_LIST_HIDDEN(2209, "This user has hidden their friend list", HttpStatus.FORBIDDEN);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
