import type { Notification } from "@/types/notification";

const NOTIFICATION_ROUTE_BY_TYPE: Record<string, string> = {
    FRIEND_REQUEST: "/contact?tab=requests",
    FRIEND_ACCEPTED: "/contact",
};

function extractPostId(referenceId: string): string {
    return referenceId.split("_")[0];
}

function isLegacySystemPostRemoval(notification: Notification): boolean {
    if (notification.type !== "SYSTEM") {
        return false;
    }

    const content = (notification.content ?? "").toLowerCase();
    return content.includes("post") && content.includes("removed");
}

export function resolveNotificationRoute(notification: Notification): string {
    const routeByType = NOTIFICATION_ROUTE_BY_TYPE[notification.type];
    if (routeByType) {
        return routeByType;
    }

    const referenceId = notification.referenceId;
    if (!referenceId) {
        return "/";
    }

    switch (notification.targetType) {
        case "POST":
            return `/post/${extractPostId(referenceId)}`;
        case "CHAT":
            return `/chat/${referenceId}`;
        case "USER":
            return `/u/${referenceId}`;
        default:
            break;
    }

    if (
        notification.type === "POST_LIKED"
        || notification.type === "POST_COMMENTED"
        || notification.type === "POST_SHARED"
        || notification.type === "POST_MENTION"
        || notification.type === "COMMENT_REPLIED"
    ) {
        return `/post/${extractPostId(referenceId)}`;
    }

    if (notification.type === "NEW_MESSAGE" || notification.type === "MENTION") {
        return `/chat/${referenceId}`;
    }

    if (notification.type === "GROUP_INVITE") {
        return `/chat/${referenceId}`;
    }

    if (isLegacySystemPostRemoval(notification)) {
        return `/post/${extractPostId(referenceId)}`;
    }

    return "/";
}
