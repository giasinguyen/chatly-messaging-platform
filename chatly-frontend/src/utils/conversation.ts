import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";

/**
 * Get the ID of the other participant in a PRIVATE conversation.
 *
 * Logic: iterate through participantIds and find the ID DIFFERENT from currentUserId.
 * (creatorId is just a reference, not reliable enough compared to participantIds)
 *
 * @param conversation  - Conversation data from API
 * @param currentUserId - ID of the logged-in user
 * @returns ID of the other participant, or null if not found
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
 * Find UserResponse by ID from the fetched users list.
 *
 * @param users - List of downloaded UserResponse
 * @param userId - ID to find
 * @returns UserResponse or undefined
 */
export function findUserById(
    users: UserResponse[],
    userId: string | null,
): UserResponse | undefined {
    if (!userId) return undefined;
    return users.find((u) => u.id === userId);
}

/**
 * Get the display label for a conversation:
 * - PRIVATE: display other participant's displayName
 * - GROUP: display group name, or fallback to "Group chat"
 */
export function getConversationDisplayName(
    conversation: ConversationResponse,
    currentUserId: string,
    users: UserResponse[],
): string {
    if (conversation.type === "PRIVATE") {
        const otherId = getOtherParticipantId(conversation, currentUserId);
        const other = findUserById(users, otherId);
        return other?.displayName ?? other?.username ?? "User";
    }
    return conversation.name ?? "Group chat";
}

/**
 * Get the avatar URL for a conversation:
 * - PRIVATE: other participant's avatar
 * - GROUP: group avatarUrl
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

