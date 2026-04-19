export type NotificationType = "NEW_MESSAGE" | "FRIEND_REQUEST" | "GROUP_INVITE" | "GROUP_JOIN_REQUEST" | "MEMBER_JOINED" | "MENTION" | "CALL_MISSED" | "SYSTEM";

export interface Notification {
    id: string;
    type: NotificationType;
    senderId: string | null;
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
