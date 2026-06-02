const JOIN_ROUTE_PREFIX = "/join/";

function getInviteBaseUrl(): string {
    const configuredBaseUrl = import.meta.env.VITE_WEB_BASE_URL?.trim();
    return (configuredBaseUrl || window.location.origin).replace(/\/+$/, "");
}

export function buildGroupInviteLink(inviteToken: string): string {
    return `${getInviteBaseUrl()}${JOIN_ROUTE_PREFIX}${inviteToken.trim()}`;
}

export function isGroupInviteLink(url: string): boolean {
    try {
        const parsedUrl = new URL(url, window.location.origin);
        return parsedUrl.pathname.startsWith(JOIN_ROUTE_PREFIX);
    } catch {
        return false;
    }
}
