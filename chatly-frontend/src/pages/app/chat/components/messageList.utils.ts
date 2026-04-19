import type { Message } from "@/types/message";

export const RECALL_LIMIT_MS = 24 * 60 * 60 * 1000;
export const EDIT_LIMIT_MS = 15 * 60 * 1000;
export const TIME_GAP_THRESHOLD = 10 * 60 * 1000;
export const QUICK_EMOJIS: readonly string[] = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export interface LightboxImage {
    id: string;
    url: string;
    name: string;
}

export function canRecall(msg: Message, currentUserId: string): boolean {
    if (msg.recalled) return false;
    if (msg.senderId !== currentUserId) return false;
    if (msg.type === "SYSTEM" || msg.type === "CALL") return false;
    const age = Date.now() - new Date(msg.createdAt).getTime();
    return age < RECALL_LIMIT_MS;
}

export function canEdit(msg: Message, currentUserId: string): boolean {
    if (msg.recalled) return false;
    if (msg.senderId !== currentUserId) return false;
    if (msg.type !== "TEXT") return false;
    const age = Date.now() - new Date(msg.createdAt).getTime();
    return age < EDIT_LIMIT_MS;
}

export function canForward(msg: Message): boolean {
    if (msg.recalled) return false;
    return ["TEXT", "IMAGE", "FILE", "GIF", "STICKER"].includes(msg.type);
}

export function formatSeenTime(readAt: string): string {
    const diff = Date.now() - new Date(readAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just seen";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
}

export function shouldShowAvatar(messages: Message[], index: number): boolean {
    const currentMsg = messages[index];
    if (!currentMsg || index === 0) return true;
    const prevMsg = messages[index - 1];
    if (!prevMsg) return true;
    if (prevMsg.senderId !== currentMsg.senderId) return true;
    const timeDiff =
        new Date(currentMsg.createdAt).getTime() -
        new Date(prevMsg.createdAt).getTime();
    return timeDiff >= TIME_GAP_THRESHOLD;
}

export function isLastInGroup(messages: Message[], index: number): boolean {
    const currentMsg = messages[index];
    if (!currentMsg) return false;
    const nextMsg = messages[index + 1];
    if (!nextMsg) return true;
    if (nextMsg.senderId !== currentMsg.senderId) return true;
    const timeDiff =
        new Date(nextMsg.createdAt).getTime() -
        new Date(currentMsg.createdAt).getTime();
    return timeDiff >= TIME_GAP_THRESHOLD;
}

export function collectImageAttachments(messages: Message[]): LightboxImage[] {
    const images: LightboxImage[] = [];
    messages.forEach((msg) => {
        if (msg.attachments) {
            msg.attachments.forEach((att, i) => {
                if (att.type?.startsWith("image/")) {
                    images.push({
                        id: `${msg.id}-${i}`,
                        url: att.url,
                        name: att.name ?? "image",
                    });
                }
            });
        }
    });
    return images;
}

export interface FailedMessageItem {
    id: string;
    content: string;
    attachments?: import("@/types/message").Attachment[];
    replyToId?: string | null;
}
