package com.chatly.model.enums;

import java.util.EnumSet;
import java.util.Set;

public enum NotificationScope {
    ALL(EnumSet.allOf(NotificationType.class)),
    CHAT(EnumSet.of(
            NotificationType.NEW_MESSAGE,
            NotificationType.MENTION,
            NotificationType.GROUP_INVITE,
            NotificationType.GROUP_JOIN_REQUEST,
            NotificationType.MEMBER_JOINED,
            NotificationType.CALL_MISSED
    )),
    SOCIAL(EnumSet.of(
            NotificationType.POST_LIKED,
            NotificationType.POST_COMMENTED,
            NotificationType.POST_SHARED,
            NotificationType.POST_MENTION,
            NotificationType.COMMENT_REPLIED,
            NotificationType.STORY_VIEWED,
            NotificationType.STORY_REACTED,
            NotificationType.STORY_REPLIED
    ));

    private final Set<NotificationType> types;

    NotificationScope(Set<NotificationType> types) {
        this.types = types;
    }

    public Set<NotificationType> getTypes() {
        return types;
    }
}
