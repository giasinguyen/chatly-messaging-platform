export type NotificationType =
    | "NEW_MESSAGE"
    | "MENTION"
    | "NEW_FOLLOWER"
    | "FRIEND_REQUEST"
    | "GROUP_INVITE"
    | "GROUP_JOIN_REQUEST"
    | "MEMBER_JOINED"
    | "CALL_MISSED"
    | "POST_LIKED"
    | "POST_COMMENTED"
    | "POST_SHARED"
    | "POST_MENTION"
    | "COMMENT_REPLIED"
    | "STORY_VIEWED"
    | "STORY_REACTED"
    | "STORY_REPLIED"
    | "SYSTEM";

export type NotificationScope = "ALL" | "CHAT" | "SOCIAL";

export interface Notification {
    id: string;
    type: NotificationType;
    senderId: string | null;
    senderName?: string | null;
    senderAvatar?: string | null;
    receiverId: string;
    referenceId: string | null;
    content: string | null;
    read: boolean;
    createdAt: string;
}

export interface NotificationEvent {
    notification: Notification;
    unreadCount: number;
}
