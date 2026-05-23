import { useEffect, type MutableRefObject } from "react";
import { conversationService } from "@/services/conversation.service";
import { contactService } from "@/services/contact.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { getOtherParticipantId } from "@/utils/conversation";
import type { ChatUser, Message } from "@/types/message";
import type {
    BlockStatusResponse,
    ContactResponse,
    ContactStatus,
} from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";
import { CHAT_WINDOW_PAGE_SIZE, getPrivacyFlag } from "./chatWindow.utils";

interface UseChatConversationInitOptions {
    id: string;
    currentUser: UserResponse | null | undefined;
    sendSeen: (messageId: string) => void;
    currentPageRef: MutableRefObject<number>;
    setLoading: (loading: boolean) => void;
    setNotFound: (notFound: boolean) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setReplyingTo: (m: Message | null) => void;
    setTypingUserIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setParticipantDirectory: React.Dispatch<
        React.SetStateAction<Record<string, ChatUser>>
    >;
    setUserDirectory: React.Dispatch<
        React.SetStateAction<Record<string, UserResponse>>
    >;
    setConversation: React.Dispatch<React.SetStateAction<ConversationResponse | null>>;
    setParticipant: React.Dispatch<React.SetStateAction<ChatUser | null>>;
    setAllContacts: React.Dispatch<React.SetStateAction<ContactResponse[]>>;
    setContactStatus: React.Dispatch<React.SetStateAction<ContactStatus | null>>;
    setBlockStatus: React.Dispatch<React.SetStateAction<BlockStatusResponse | null>>;
    setHasMore: (has: boolean) => void;
    setPinnedMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setCurrentPinnedIdx: React.Dispatch<React.SetStateAction<number>>;
    setPresenceMap: React.Dispatch<
        React.SetStateAction<Record<string, { status: string; lastSeen: string | null }>>
    >;
}

function buildParticipant(participantId: string, user?: UserResponse): ChatUser {
    if (!user) {
        return { id: participantId, displayName: "User", username: "" };
    }
    return {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        dob: user.dob,
        role: user.role,
    };
}

export function useChatConversationInit({
    id,
    currentUser,
    sendSeen,
    currentPageRef,
    setLoading,
    setNotFound,
    setMessages,
    setReplyingTo,
    setTypingUserIds,
    setParticipantDirectory,
    setUserDirectory,
    setConversation,
    setParticipant,
    setAllContacts,
    setContactStatus,
    setBlockStatus,
    setHasMore,
    setPinnedMessages,
    setCurrentPinnedIdx,
    setPresenceMap,
}: UseChatConversationInitOptions) {
    useEffect(() => {
        if (!currentUser || !id) return;
        let cancelled = false;

        const init = async () => {
            try {
                setLoading(true);
                setNotFound(false);
                setMessages([]);
                setReplyingTo(null);
                setTypingUserIds(new Set());
                setParticipantDirectory({});
                currentPageRef.current = 0;
                setHasMore(false);

                const [convRes, usersRes, contactsRes] = await Promise.all([
                    conversationService.getById(id),
                    userService.getAll(),
                    contactService.getAll().catch(() => ({ result: [] })),
                ]);
                if (cancelled) return;

                const conv = convRes.result;
                setConversation(conv);

                const allUsers = usersRes.result ?? [];
                setUserDirectory(
                    Object.fromEntries(allUsers.map((u) => [u.id, u])),
                );
                const fetchedContacts = contactsRes.result ?? [];
                setAllContacts(fetchedContacts);

                const directory = Object.fromEntries(
                    conv.participantIds.map((participantId) => [
                        participantId,
                        buildParticipant(
                            participantId,
                            allUsers.find((u) => u.id === participantId),
                        ),
                    ]),
                );
                setParticipantDirectory(directory);

                if (conv.type === "PRIVATE") {
                    const otherId = getOtherParticipantId(conv, currentUser.id);
                    const other = allUsers.find((u) => u.id === otherId);
                    const otherRecord = (other ?? {}) as Record<string, unknown>;

                    setParticipant(
                        other
                            ? {
                                  id: other.id,
                                  displayName: other.displayName,
                                  username: other.username,
                                  avatarUrl: other.avatarUrl,
                                  phone: other.phone,
                                  dob: other.dob,
                                  role: other.role,
                                  privacy: {
                                      showPhone: getPrivacyFlag(otherRecord, "phone"),
                                      showDob: getPrivacyFlag(otherRecord, "dob"),
                                  },
                              }
                            : { id: otherId ?? "", displayName: "User", username: "" },
                    );

                    const relation = fetchedContacts.find(
                        (c) =>
                            (c.user.id === currentUser.id && c.contact.id === otherId) ||
                            (c.user.id === otherId && c.contact.id === currentUser.id),
                    );
                    setContactStatus(relation?.status ?? null);
                    if (relation?.status === "BLOCKED") {
                        const direction =
                            relation.blockedBy === currentUser.id
                                ? "I_BLOCKED"
                                : "BLOCKED_ME";
                        setBlockStatus({
                            blocked: true,
                            blockedBy: relation.blockedBy ?? null,
                            direction,
                        });
                    } else {
                        setBlockStatus(null);
                    }

                    if (other && otherId) {
                        setPresenceMap((prev) => ({
                            ...prev,
                            [otherId]: {
                                status: other.status ?? "OFFLINE",
                                lastSeen: other.lastSeen ?? null,
                            },
                        }));
                    }
                } else {
                    const firstMemberWithAvatar = conv.participantIds
                        .map((pid) => directory[pid])
                        .find((m) => m?.avatarUrl);
                    setParticipant({
                        id: conv.id,
                        displayName: conv.name ?? "Chat group",
                        username: "group",
                        avatarUrl: conv.avatarUrl ?? firstMemberWithAvatar?.avatarUrl,
                    });
                    setContactStatus(null);
                }

                const msgRes = await messageService.getByConversation(
                    id,
                    0,
                    CHAT_WINDOW_PAGE_SIZE,
                );
                if (cancelled) return;
                const fetched = msgRes.result ?? [];
                setMessages([...fetched].reverse());
                setHasMore(fetched.length === CHAT_WINDOW_PAGE_SIZE);

                try {
                    const pinnedRes = await messageService.getPinnedMessages(id);
                    if (!cancelled) {
                        setPinnedMessages(pinnedRes.result ?? []);
                        setCurrentPinnedIdx(0);
                    }
                } catch {
                    /* non-critical */
                }

                fetched.forEach((m) => {
                    if (m.senderId !== currentUser.id && m.status !== "READ") {
                        sendSeen(m.id);
                    }
                });
            } catch (err) {
                console.error("Error loading conversation:", err);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, currentUser, sendSeen]);
}
