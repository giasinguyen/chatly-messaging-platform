export const CHAT_WINDOW_PAGE_SIZE = 20;
export const MESSAGE_NOTIFICATION_SOUND_URL = "/sounds/message_ting_ting.mp3";

type PrivacyField = "phone" | "dob";

function normalizeVisibility(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;
    const normalized = value.toLowerCase();
    if (
        normalized === "hidden" ||
        normalized === "none" ||
        normalized === "private"
    ) {
        return false;
    }
    if (
        normalized === "everyone" ||
        normalized === "public" ||
        normalized === "friends"
    ) {
        return true;
    }
    return undefined;
}

export function getPrivacyFlag(
    user: Record<string, unknown>,
    field: PrivacyField,
): boolean {
    const privacy = user.privacy as Record<string, unknown> | undefined;

    if (field === "phone") {
        const direct = normalizeVisibility(user.showPhone);
        const nested = normalizeVisibility(privacy?.showPhone);
        const directVisibility = normalizeVisibility(user.phoneVisibility);
        const nestedVisibility = normalizeVisibility(privacy?.phoneVisibility);

        if (typeof direct === "boolean") return direct;
        if (typeof nested === "boolean") return nested;
        if (typeof directVisibility === "boolean") return directVisibility;
        if (typeof nestedVisibility === "boolean") return nestedVisibility;
    }

    const direct = normalizeVisibility(user.showDob);
    const nested = normalizeVisibility(privacy?.showDob);
    const directVisibility = normalizeVisibility(user.dobVisibility);
    const nestedVisibility = normalizeVisibility(privacy?.dobVisibility);

    if (typeof direct === "boolean") return direct;
    if (typeof nested === "boolean") return nested;
    if (typeof directVisibility === "boolean") return directVisibility;
    if (typeof nestedVisibility === "boolean") return nestedVisibility;
    return true;
}

export function formatDob(dob?: string): string {
    if (!dob) return "Not set";
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(parsed);
}

export function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null) {
        const candidate = error as {
            response?: { data?: { message?: unknown } };
            message?: unknown;
        };
        const apiMessage = candidate.response?.data?.message;
        if (typeof apiMessage === "string" && apiMessage.length > 0) {
            return apiMessage;
        }
        if (typeof candidate.message === "string" && candidate.message.length > 0) {
            return candidate.message;
        }
    }
    return fallback;
}
