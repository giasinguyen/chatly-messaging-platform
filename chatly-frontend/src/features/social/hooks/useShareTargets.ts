import { useEffect, useState } from "react";
import { toast } from "sonner";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import type { ContactResponse } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";

interface ShareFriend {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface ShareGroupConversation {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

function getOtherUser(contact: ContactResponse, currentUserId: string | undefined): ShareFriend {
    const user = contact.user.id === currentUserId ? contact.contact : contact.user;
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
}

export function useShareTargets(open: boolean, currentUserId: string | undefined) {
    const [friends, setFriends] = useState<ShareFriend[]>([]);
    const [privateConversations, setPrivateConversations] = useState<ConversationResponse[]>([]);
    const [groupConversations, setGroupConversations] = useState<ShareGroupConversation[]>([]);
    const [hasLoadedTargets, setHasLoadedTargets] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        let isActive = true;

        Promise.all([contactService.getByStatus("ACCEPTED"), conversationService.getMyConversations()])
            .then(([contactsResponse, conversationsResponse]) => {
                if (!isActive) {
                    return;
                }

                setFriends(
                    (contactsResponse.result ?? []).map((contact) =>
                        getOtherUser(contact, currentUserId),
                    ),
                );

                const conversations = conversationsResponse.result ?? [];
                setPrivateConversations(
                    conversations.filter((conversation) => conversation.type === "PRIVATE"),
                );
                setGroupConversations(
                    conversations
                        .filter((conversation) => conversation.type === "GROUP")
                        .map((conversation) => ({
                            id: conversation.id,
                            name: conversation.name?.trim() || "Unnamed group",
                            avatarUrl: conversation.avatarUrl,
                        })),
                );
                setHasLoadedTargets(true);
            })
            .catch(() => {
                if (!isActive) {
                    return;
                }

                setFriends([]);
                setPrivateConversations([]);
                setGroupConversations([]);
                setHasLoadedTargets(true);
                toast.error("Could not load friends and groups.");
            });

        return () => {
            isActive = false;
        };
    }, [open, currentUserId]);

    return {
        friends,
        privateConversations,
        groupConversations,
        isLoadingTargets: open && !hasLoadedTargets,
    };
}

export type { ShareFriend, ShareGroupConversation };