import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { messageService } from "@/services/message.service";
import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/auth.store";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import { useNotificationStore } from "@/store/notification.store";
import { useChatSocket } from "@/hooks/useChatSocket";
import {
    usePresenceSocket,
    type PresenceEvent,
} from "@/hooks/usePresenceSocket";
import type { ChatEvent, ChatUser, Message } from "@/types/message";
import type {
    BlockStatusResponse,
    ContactResponse,
    ContactStatus,
} from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";
import {
    CHAT_WINDOW_PAGE_SIZE,
    MESSAGE_NOTIFICATION_SOUND_URL,
} from "./chatWindow.utils";
import type { FailedMessageItem } from "./messageList.utils";
import { useChatConversationInit } from "./useChatConversationInit";

const CONTACT_SUSPENDED_ERROR_CODE = 1206;

interface UseChatConversationDataOptions {
    id: string;
}

export function useChatConversationData({ id }: UseChatConversationDataOptions) {
    const currentUser = useAuthStore((s) => s.user);
    const { getPrefs } = useConversationPrefsStore();
    const markConvMessagesRead = useNotificationStore(
        (s) => s.markConvMessagesRead,
    );
    const unreadMsgCountForConv = useNotificationStore(
        (s) =>
            s.notifications.filter(
                (n) => n.type === "NEW_MESSAGE" && n.referenceId === id && !n.read,
            ).length,
    );

    const [conversation, setConversation] = useState<ConversationResponse | null>(null);
    const [participant, setParticipant] = useState<ChatUser | null>(null);
    const [participantDirectory, setParticipantDirectory] = useState<Record<string, ChatUser>>({});
    const [userDirectory, setUserDirectory] = useState<Record<string, UserResponse>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
    const [failedMessages, setFailedMessages] = useState<FailedMessageItem[]>([]);

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const currentPageRef = useRef(0);

    const [contactStatus, setContactStatus] = useState<ContactStatus | null>(null);
    const [blockStatus, setBlockStatus] = useState<BlockStatusResponse | null>(null);
    const [allContacts, setAllContacts] = useState<ContactResponse[]>([]);

    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [currentPinnedIdx, setCurrentPinnedIdx] = useState(0);

    const [presenceMap, setPresenceMap] = useState<
        Record<string, { status: string; lastSeen: string | null }>
    >({});

    useEffect(() => {
        if (unreadMsgCountForConv === 0) return;
        const unread = useNotificationStore
            .getState()
            .notifications.filter(
                (n) => n.type === "NEW_MESSAGE" && n.referenceId === id && !n.read,
            );
        markConvMessagesRead(id);
        Promise.all(unread.map((n) => notificationService.markAsRead(n.id))).catch(
            () => {},
        );
    }, [id, unreadMsgCountForConv, markConvMessagesRead]);

    const onEvent = useCallback(
        (event: ChatEvent) => {
            const { action, message: msg } = event;
            if (action === "GROUP_UPDATE" || action === "ROLE_UPDATED") return;
            if (!msg) return;

            if (action === "SEND") {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                if (msg.senderId !== currentUser?.id) {
                    sendSeen(msg.id);
                    const isMuted = getPrefs(id).isMuted ?? false;
                    if (!isMuted) {
                        new Audio(MESSAGE_NOTIFICATION_SOUND_URL)
                            .play()
                            .catch(() => {});
                    }
                }
            } else if (action === "EDIT" || action === "RECALL" || action === "REACT") {
                setMessages((prev) =>
                    prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
                );
                // Sync pinned messages list when pin status changes
                if (msg.pinned !== undefined) {
                    setPinnedMessages((prev) => {
                        const exists = prev.some((m) => m.id === msg.id);
                        if (msg.pinned && !exists) {
                            return [...prev, msg];
                        }
                        if (!msg.pinned && exists) {
                            return prev.filter((m) => m.id !== msg.id);
                        }
                        if (exists) {
                            return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
                        }
                        return prev;
                    });
                }
            } else if (action === "DELETE") {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUser?.id, id, getPrefs],
    );

    const onTyping = useCallback(
        (data: { userId: string; typing: boolean }) => {
            if (data.userId === currentUser?.id) return;
            setTypingUserIds((prev) => {
                const next = new Set(prev);
                if (data.typing) next.add(data.userId);
                else next.delete(data.userId);
                return next;
            });
        },
        [currentUser?.id],
    );

    const onRead = useCallback((msg: Message) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === msg.id
                    ? { ...m, status: msg.status, readBy: msg.readBy }
                    : m,
            ),
        );
    }, []);

    const { sendMessage, sendTyping, sendSeen } = useChatSocket({
        conversationId: id,
        onEvent,
        onTyping,
        onRead,
        onError: (errorPayload) => {
            if (errorPayload.code === CONTACT_SUSPENDED_ERROR_CODE) {
                toast.error(
                    errorPayload.message
                        ?? "This user has been banned and cannot receive messages.",
                );
                return;
            }
            if (errorPayload.message) {
                toast.error(errorPayload.message);
            }
        },
    });

    const onPresenceChange = useCallback((event: PresenceEvent) => {
        setPresenceMap((prev) => ({
            ...prev,
            [event.userId]: { status: event.status, lastSeen: event.lastSeen },
        }));
    }, []);

    usePresenceSocket({ onPresenceChange });

    useChatConversationInit({
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
    });

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        try {
            setIsLoadingMore(true);
            const nextPage = currentPageRef.current + 1;
            const res = await messageService.getByConversation(
                id,
                nextPage,
                CHAT_WINDOW_PAGE_SIZE,
            );
            const fetched = res.result ?? [];
            setMessages((prev) => [...[...fetched].reverse(), ...prev]);
            currentPageRef.current = nextPage;
            setHasMore(fetched.length === CHAT_WINDOW_PAGE_SIZE);
        } catch (err) {
            console.error("Error loading more messages:", err);
            toast.error("Could not load older messages");
        } finally {
            setIsLoadingMore(false);
        }
    }, [id, isLoadingMore, hasMore]);

    return {
        currentUser,
        conversation,
        setConversation,
        participant,
        setParticipant,
        participantDirectory,
        userDirectory,
        messages,
        setMessages,
        replyingTo,
        setReplyingTo,
        loading,
        notFound,
        typingUserIds,
        failedMessages,
        setFailedMessages,
        isLoadingMore,
        hasMore,
        contactStatus,
        setContactStatus,
        blockStatus,
        setBlockStatus,
        allContacts,
        setAllContacts,
        pinnedMessages,
        setPinnedMessages,
        currentPinnedIdx,
        setCurrentPinnedIdx,
        presenceMap,
        getPrefs,
        sendMessage,
        sendTyping,
        sendSeen,
        handleLoadMore,
    };
}

export type ChatConversationData = ReturnType<typeof useChatConversationData>;
