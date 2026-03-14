import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";

/**
 * Lấy ID của người dùng đối phương trong một PRIVATE conversation.
 *
 * Logic: duyệt qua participantIds và lấy người KHÁC với currentUserId.
 * (creatorId chỉ là tham chiếu, không đủ tin cậy để dùng thay vì so sánh participantIds)
 *
 * @param conversation  - Dữ liệu conversation từ API
 * @param currentUserId - ID của user đang đăng nhập
 * @returns ID của người đối diện, hoặc null nếu không tìm thấy
 */
export function getOtherParticipantId(
    conversation: ConversationResponse,
    currentUserId: string,
): string | null {
    return (
        conversation.participantIds.find((id) => id !== currentUserId) ?? null
    );
}

/**
 * Tìm UserResponse theo ID từ danh sách users đã fetch.
 *
 * @param users - Danh sách UserResponse đã tải về
 * @param userId - ID cần tìm
 * @returns UserResponse hoặc undefined
 */
export function findUserById(
    users: UserResponse[],
    userId: string | null,
): UserResponse | undefined {
    if (!userId) return undefined;
    return users.find((u) => u.id === userId);
}

/**
 * Lấy label hiển thị cho một conversation:
 * - PRIVATE: hiển thị displayName của người đối phương
 * - GROUP: hiển thị tên nhóm, hoặc fallback là "Nhóm chat"
 */
export function getConversationDisplayName(
    conversation: ConversationResponse,
    currentUserId: string,
    users: UserResponse[],
): string {
    if (conversation.type === "PRIVATE") {
        const otherId = getOtherParticipantId(conversation, currentUserId);
        const other = findUserById(users, otherId);
        return other?.displayName ?? other?.username ?? "Người dùng";
    }
    return conversation.name ?? "Nhóm chat";
}

/**
 * Lấy avatar URL cho một conversation:
 * - PRIVATE: avatar của người đối phương
 * - GROUP: avatarUrl của nhóm
 */
export function getConversationAvatar(
    conversation: ConversationResponse,
    currentUserId: string,
    users: UserResponse[],
): string | undefined {
    if (conversation.type === "PRIVATE") {
        const otherId = getOtherParticipantId(conversation, currentUserId);
        const other = findUserById(users, otherId);
        return other?.avatarUrl;
    }
    return conversation.avatarUrl ?? undefined;
}

