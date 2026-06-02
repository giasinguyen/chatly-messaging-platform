import type { ConversationResponse } from "@/types/conversation";

const CONVERSATION_REFRESH_EVENT = "chatly:conversation-refresh";

interface ConversationRefreshDetail {
    conversationId: string;
}

export function requestConversationRefresh(conversationId: string) {
    window.dispatchEvent(
        new CustomEvent<ConversationRefreshDetail>(CONVERSATION_REFRESH_EVENT, {
            detail: { conversationId },
        }),
    );
}

export function listenForConversationRefresh(
    listener: (conversationId: string) => void,
) {
    const handleRefresh = (event: Event) => {
        if (!(event instanceof CustomEvent)) return;
        const detail = event.detail;
        if (
            !detail ||
            typeof detail !== "object" ||
            !("conversationId" in detail) ||
            typeof detail.conversationId !== "string"
        ) {
            return;
        }

        listener(detail.conversationId);
    };

    window.addEventListener(CONVERSATION_REFRESH_EVENT, handleRefresh);
    return () => {
        window.removeEventListener(CONVERSATION_REFRESH_EVENT, handleRefresh);
    };
}

export function upsertConversation(
    conversations: ConversationResponse[],
    conversation: ConversationResponse,
) {
    if (!conversations.some((item) => item.id === conversation.id)) {
        return [conversation, ...conversations];
    }

    return conversations.map((item) =>
        item.id === conversation.id ? conversation : item,
    );
}
