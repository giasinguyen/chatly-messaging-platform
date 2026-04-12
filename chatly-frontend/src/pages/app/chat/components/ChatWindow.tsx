import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatInputRef } from "./ChatInput";
import { MessageSearch } from "./MessageSearch";
import { GroupManagementPanel } from "./GroupManagementPanel";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { PinnedMessagesDialog } from "./PinnedMessagesDialog";
import { conversationService } from "@/services/conversation.service";
import { contactService } from "@/services/contact.service";
import { messageService } from "@/services/message.service";
import { notificationService } from "@/services/notification.service";
import { userService } from "@/services/user.service";
import { groupService } from "@/services/group.service";
import { fileService } from "@/services/file.service";
import { useAuthStore } from "@/store/auth.store";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import { useNotificationStore } from "@/store/notification.store";
import { useChatSocket } from "@/hooks/useChatSocket";
import {
    usePresenceSocket,
    type PresenceEvent,
} from "@/hooks/usePresenceSocket";
import { getOtherParticipantId } from "@/utils/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    CalendarDays,
    Copy,
    Loader2,
    LogOut,
    Pencil,
    Phone,
    Settings,
    UserPlus,
    Upload,
    BarChart3,
    Pin,
    PinOff,
    ChevronLeft,
    ChevronRight,
    X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Message, ChatUser, ChatEvent } from "@/types/message";
import type { ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";

const PAGE_SIZE = 20;

interface ChatWindowProps {
    id: string;
    onConversationUpdated?: (updated: ConversationResponse) => void;
}

function getPrivacyFlag(user: Record<string, unknown>, field: "phone" | "dob") {
    const privacy = user.privacy as Record<string, unknown> | undefined;
    const normalizeVisibility = (value: unknown) => {
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
    };

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

function formatDob(dob?: string) {
    if (!dob) return "Not set";
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(parsed);
}

export const ChatWindow = memo(({ id, onConversationUpdated }: ChatWindowProps) => {
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const { getPrefs } = useConversationPrefsStore();
    const [failedMessages, setFailedMessages] = useState<Array<{ id: string, content: string, attachments?: import("@/types/message").Attachment[], replyToId?: string | null }>>([]);
    const markConvMessagesRead = useNotificationStore(
        (s) => s.markConvMessagesRead,
    );
    // Watchdog: whenever msg notifications accumulate while user is in this ChatWindow, clear them
    const unreadMsgCountForConv = useNotificationStore(
        (s) =>
            s.notifications.filter((n) => n.type === "NEW_MESSAGE" && n.referenceId === id && !n.read)
                .length,
    );
    useEffect(() => {
        if (unreadMsgCountForConv === 0) return;
        const unread = useNotificationStore
            .getState()
            .notifications.filter((n) => n.type === "NEW_MESSAGE" && n.referenceId === id && !n.read);
        markConvMessagesRead(id);
        Promise.all(
            unread.map((n) => notificationService.markAsRead(n.id)),
        ).catch(() => {});
    }, [id, unreadMsgCountForConv, markConvMessagesRead]);

    const [conversation, setConversation] =
        useState<ConversationResponse | null>(null);
    const [participant, setParticipant] = useState<ChatUser | null>(null);
    const [participantDirectory, setParticipantDirectory] = useState<
        Record<string, ChatUser>
    >({});
    const [userDirectory, setUserDirectory] = useState<Record<string, UserResponse>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Typing indicators
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

    // Pagination load-more
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const currentPageRef = useRef(0);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [contactStatus, setContactStatus] = useState<ContactStatus | null>(
        null,
    );
    const [sendingContact, setSendingContact] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupNameDraft, setGroupNameDraft] = useState("");
    const [groupAvatarDraft, setGroupAvatarDraft] = useState("");
    const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
    const [groupProfileSaving, setGroupProfileSaving] = useState(false);
    const [showGroupPanel, setShowGroupPanel] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(true);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [groupPanelDefaultTab, setGroupPanelDefaultTab] = useState<"members" | "settings">("members");
    const [createGroupFromPrivateOpen, setCreateGroupFromPrivateOpen] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const groupAvatarInputRef = useRef<HTMLInputElement>(null);

    // Pinned messages banner state
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [currentPinnedIdx, setCurrentPinnedIdx] = useState(0);
    const [showPinnedDialog, setShowPinnedDialog] = useState(false);
    const [dismissedPollIds, setDismissedPollIds] = useState<Set<string>>(new Set());

    // Derive the latest active (non-closed) poll from messages
    const activePoll = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.type === "POLL" && m.poll && !m.poll.closed) return m;
        }
        return null;
    }, [messages]);

    const [selectedProfileUser, setSelectedProfileUser] =
        useState<ChatUser | null>(null);
    // Presence tracking
    const [presenceMap, setPresenceMap] = useState<
        Record<string, { status: string; lastSeen: string | null }>
    >({});

    // Drag Drop state
    const chatInputRef = useRef<ChatInputRef>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            chatInputRef.current?.addFiles(files);
        }
    };

    // ----------------------------------------------------------------
    // 1. WebSocket Hook Integration
    // ----------------------------------------------------------------
    const onEvent = useCallback(
        (event: ChatEvent) => {
            const { action, message: msg } = event;

            // Ignore GROUP_UPDATE events in ChatWindow message handler
            if (action === "GROUP_UPDATE") return;

            // Guard: msg should be defined for message actions
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
                        new Audio("/sounds/message_ting_ting.mp3").play().catch(() => {});
                    }
                }
            } else if (action === "EDIT" || action === "RECALL" || action === "REACT") {
                setMessages((prev) =>
                    prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
                );
            } else if (action === "DELETE") {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            }
        },
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
    });

    // Presence socket hook
    const onPresenceChange = useCallback((event: PresenceEvent) => {
        setPresenceMap((prev) => ({
            ...prev,
            [event.userId]: { status: event.status, lastSeen: event.lastSeen },
        }));
    }, []);

    usePresenceSocket({ onPresenceChange });

    // ----------------------------------------------------------------
    // 2. Fetch initial data
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!currentUser || !id) return;

        let cancelled = false;

        const init = async () => {
            try {
                setLoading(true);
                setNotFound(false);
                setMessages([]);
                setReplyingTo(null);
                setSelectedProfileUser(null);
                setTypingUserIds(new Set());
                setParticipantDirectory({});
                currentPageRef.current = 0;
                setHasMore(false);

                // Fetch conversation detail and all users in parallel
                const [convRes, usersRes, contactsRes] = await Promise.all([
                    conversationService.getById(id),
                    userService.getAll(),
                    contactService.getAll().catch(() => ({ result: [] })),
                ]);
                if (cancelled) return;

                const conv = convRes.result;
                setConversation(conv);

                // Get participant info for display
                const allUsers = usersRes.result ?? [];
                setUserDirectory(
                    Object.fromEntries(allUsers.map((user) => [user.id, user])),
                );
                const allContacts = contactsRes.result ?? [];
                const directory = Object.fromEntries(
                    conv.participantIds.map((participantId) => {
                        const foundUser = allUsers.find(
                            (u) => u.id === participantId,
                        );
                        const mapped: ChatUser = foundUser
                            ? {
                                  id: foundUser.id,
                                  displayName: foundUser.displayName,
                                  username: foundUser.username,
                                  avatarUrl: foundUser.avatarUrl,
                                  phone: foundUser.phone,
                                  dob: foundUser.dob,
                              }
                            : {
                                  id: participantId,
                                  displayName: "User",
                                  username: "",
                              };
                        return [participantId, mapped];
                    }),
                );
                setParticipantDirectory(directory);

                if (conv.type === "PRIVATE") {
                    const otherId = getOtherParticipantId(conv, currentUser.id);
                    const other = allUsers.find((u) => u.id === otherId);
                    const otherRecord = (other ?? {}) as Record<
                        string,
                        unknown
                    >;

                    setParticipant(
                        other
                            ? {
                                  id: other.id,
                                  displayName: other.displayName,
                                  username: other.username,
                                  avatarUrl: other.avatarUrl,
                                  phone: other.phone,
                                  dob: other.dob,
                                  privacy: {
                                      showPhone: getPrivacyFlag(
                                          otherRecord,
                                          "phone",
                                      ),
                                      showDob: getPrivacyFlag(
                                          otherRecord,
                                          "dob",
                                      ),
                                  },
                              }
                            : {
                                  id: otherId ?? "",
                                  displayName: "User",
                                  username: "",
                              },
                    );

                    const relation = allContacts.find(
                        (c) =>
                            (c.user.id === currentUser.id &&
                                c.contact.id === otherId) ||
                            (c.user.id === otherId &&
                                c.contact.id === currentUser.id),
                    );
                    setContactStatus(relation?.status ?? null);

                    // Initialize presence from fetched user data
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
                        .map((participantId) => directory[participantId])
                        .find((member) => member?.avatarUrl);

                    setParticipant({
                        id: conv.id,
                        displayName: conv.name ?? "Chat group",
                        username: "group",
                        avatarUrl:
                            conv.avatarUrl ?? firstMemberWithAvatar?.avatarUrl,
                    });
                    setContactStatus(null);
                }

                // Fetch first page of messages
                const msgRes = await messageService.getByConversation(
                    id,
                    0,
                    PAGE_SIZE,
                );
                if (cancelled) return;

                const fetched = msgRes.result ?? [];
                setMessages([...fetched].reverse());
                setHasMore(fetched.length === PAGE_SIZE);

                // Load pinned messages for the banner
                try {
                    const pinnedRes = await messageService.getPinnedMessages(id);
                    if (!cancelled) {
                        setPinnedMessages(pinnedRes.result ?? []);
                        setCurrentPinnedIdx(0);
                    }
                } catch { /* non-critical */ }

                // Mark unread messages as seen
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
    }, [id, currentUser, sendSeen]);

    // ----------------------------------------------------------------
    // 3. Load more old messages when scrolling up
    // ----------------------------------------------------------------
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        try {
            setIsLoadingMore(true);
            const nextPage = currentPageRef.current + 1;
            const res = await messageService.getByConversation(
                id,
                nextPage,
                PAGE_SIZE,
            );
            const fetched = res.result ?? [];

            setMessages((prev) => [...[...fetched].reverse(), ...prev]);
            currentPageRef.current = nextPage;
            setHasMore(fetched.length === PAGE_SIZE);
        } catch (err) {
            console.error("Error loading more messages:", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [id, isLoadingMore, hasMore]);

    // ----------------------------------------------------------------
    // 4. Handlers: Send message, Reply, Recall, Edit
    // ----------------------------------------------------------------
    const handleSendMessage = useCallback(
        (
            content: string,
            attachments?: import("@/types/message").Attachment[],
            poll?: import("@/types/message").Poll,
            mentions?: string[],
        ) => {
            if (!id || !currentUser) return;
            const success = sendMessage(content, replyingTo?.id ?? null, attachments, poll, undefined, mentions);
            if (!success) {
                toast.error("Connection lost! Could not send message.");
                setFailedMessages((prev) => [
                    ...prev,
                    { id: `failed-${Date.now()}`, content, attachments, replyToId: replyingTo?.id },
                ]);
            }
            setReplyingTo(null);
        },
        [id, currentUser, replyingTo, sendMessage],
    );

    const handleRetryMessage = useCallback((failedId: string) => {
        const msg = failedMessages.find(m => m.id === failedId);
        if (!msg) return;
        const success = sendMessage(msg.content, msg.replyToId ?? null, msg.attachments);
        if (success) {
            setFailedMessages(prev => prev.filter(m => m.id !== failedId));
        } else {
            toast.error("Please try again later.");
        }
    }, [failedMessages, sendMessage]);

    const handleReply = useCallback((msg: Message) => setReplyingTo(msg), []);
    const handleCancelReply = useCallback(() => setReplyingTo(null), []);

    const handleRecall = useCallback(
        async (messageId: string) => {
            try {
                await messageService.recall(messageId);
                // Optimistic update (WebSocket will also broadcast it)
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  recalled: true,
                                  recalledAt: new Date().toISOString(),
                                  recalledBy: currentUser?.id ?? null,
                              }
                            : m,
                    ),
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not recall message";
                toast.error(msg);
            }
        },
        [currentUser?.id],
    );

    const handleEdit = useCallback(
        async (messageId: string, newContent: string) => {
            try {
                await messageService.edit(messageId, newContent);
                // Optimistic update (WebSocket will also broadcast it)
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  content: newContent,
                                  edited: true,
                                  editedAt: new Date().toISOString(),
                              }
                            : m,
                    ),
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not edit message";
                toast.error(msg);
            }
        },
        [],
    );

    const handleDelete = useCallback(
        async (messageId: string) => {
            try {
                await messageService.delete(messageId);
                // Optimistic update
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
                toast.success("Message deleted");
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not delete message";
                toast.error(msg);
            }
        },
        [],
    );

    const handleForward = useCallback((message: Message) => {
        setForwardingMessage(message);
    }, []);

    const handleForwardConfirm = useCallback(
        async (targetConversationIds: string[]) => {
            if (!forwardingMessage) return;

            try {
                await messageService.forward(forwardingMessage.id, targetConversationIds);
                toast.success(
                    targetConversationIds.length > 1
                        ? "Message forwarded"
                        : "Message forwarded to selected conversation",
                );
                setForwardingMessage(null);
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not forward message";
                toast.error(msg);
                throw err;
            }
        },
        [forwardingMessage],
    );

    const handleReact = useCallback(
        async (messageId: string, emoji: string) => {
            try {
                const res = await messageService.react(messageId, emoji);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, reactions: res.result.reactions }
                            : m,
                    ),
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not react to message";
                toast.error(msg);
            }
        },
        [],
    );

    const handleOpenSenderProfile = useCallback(
        (senderId: string) => {
            const user = participantDirectory[senderId];
            if (!user) return;
            setSelectedProfileUser(user);
            setShowProfileDialog(true);
        },
        [participantDirectory],
    );

    const handleVotePoll = useCallback(
        async (messageId: string, optionIndex: number) => {
            try {
                const res = await messageService.votePoll(messageId, optionIndex);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, poll: res.result.poll }
                            : m,
                    ),
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not vote";
                toast.error(msg);
            }
        },
        [],
    );

    const handleTogglePin = useCallback(
        async (messageId: string) => {
            try {
                const res = await messageService.togglePin(messageId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, pinned: res.result.pinned, pinnedAt: res.result.pinnedAt, pinnedBy: res.result.pinnedBy }
                            : m,
                    ),
                );
                // Refresh pinned banner
                const pinned = await messageService.getPinnedMessages(id);
                setPinnedMessages(pinned.result);
                setCurrentPinnedIdx(0);
                toast.success(res.result.pinned ? "Message pinned" : "Message unpinned");
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not pin message";
                toast.error(msg);
            }
        },
        [id],
    );

    const handleClosePoll = useCallback(
        async (messageId: string) => {
            try {
                const res = await messageService.closePoll(messageId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, poll: res.result.poll }
                            : m,
                    ),
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ??
                    "Could not end poll";
                toast.error(msg);
            }
        },
        [],
    );

    const handleTagPriority = useCallback(
        async (messageId: string, priority: string) => {
            try {
                const res = await messageService.tagPriority(messageId, priority);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, priority: res.result.priority }
                            : m,
                    ),
                );
                toast.success(
                    res.result.priority
                        ? `Marked as ${res.result.priority.toLowerCase()}`
                        : "Priority removed",
                );
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message ?? "Could not tag priority";
                toast.error(msg);
            }
        },
        [],
    );

    const handleSendFriendRequest = useCallback(async () => {
        const targetUser =
            selectedProfileUser ??
            (conversation?.type === "PRIVATE" ? participant : null);
        if (!targetUser) return;
        if (contactStatus === "ACCEPTED" || contactStatus === "PENDING") return;

        try {
            setSendingContact(true);
            await contactService.sendRequest({ contactId: targetUser.id });
            setContactStatus("PENDING");
            toast.success("Friend request sent");
        } catch (error) {
            toast.error("Could not send friend request");
        } finally {
            setSendingContact(false);
        }
    }, [selectedProfileUser, conversation?.type, participant, contactStatus]);

    useEffect(() => {
        if (
            !showProfileDialog ||
            conversation?.type !== "GROUP" ||
            !participant
        ) {
            setIsEditingGroup(false);
            return;
        }

        setGroupNameDraft(
            participant.displayName || conversation.name || "Chat group",
        );
        setGroupAvatarDraft(
            participant.avatarUrl || conversation.avatarUrl || "",
        );
    }, [
        showProfileDialog,
        conversation?.type,
        conversation?.name,
        conversation?.avatarUrl,
        participant?.displayName,
        participant?.avatarUrl,
    ]);

    const handleGroupAvatarFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setGroupAvatarUploading(true);
        try {
            const res = await fileService.upload(file);
            setGroupAvatarDraft(res.url);
            toast.success("Image uploaded");
        } catch {
            toast.error("Could not upload image");
        } finally {
            setGroupAvatarUploading(false);
            if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = "";
        }
    }, []);

    const handleSaveGroupProfile = useCallback(async () => {
        if (conversation?.type !== "GROUP" || !conversation?.id) return;

        const nextName = groupNameDraft.trim();
        if (!nextName) {
            toast.error("Group name cannot be empty");
            return;
        }

        const nextAvatar = groupAvatarDraft.trim();
        setGroupProfileSaving(true);
        try {
            await groupService.updateGroup(conversation.id, {
                name: nextName,
                avatar: nextAvatar || undefined,
            });
            setParticipant((prev) =>
                prev ? { ...prev, displayName: nextName, avatarUrl: nextAvatar || prev.avatarUrl } : prev,
            );
            setConversation((prev) =>
                prev ? { ...prev, name: nextName, avatarUrl: nextAvatar || prev.avatarUrl } : prev,
            );
            setIsEditingGroup(false);
            toast.success("Group information updated");
        } catch {
            toast.error("Could not update group information");
        } finally {
            setGroupProfileSaving(false);
        }
    }, [conversation?.type, conversation?.id, groupAvatarDraft, groupNameDraft]);

    const messageUserDirectory = useMemo(
        () => ({
            ...userDirectory,
            ...participantDirectory,
        }),
        [participantDirectory, userDirectory],
    );

    // ----------------------------------------------------------------
    // Render states
    // ----------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex-1 flex flex-col bg-muted/20 p-4 sm:p-6 gap-6 overflow-hidden">
                <div className="flex w-full items-end gap-2 justify-end opacity-50">
                    <div className="w-[60%] max-w-[300px] h-12 bg-brand/30 rounded-2xl rounded-br-sm animate-pulse" />
                </div>
                <div className="flex w-full items-end gap-2 justify-start opacity-50">
                    <div className="w-8 h-8 rounded-full bg-border animate-pulse shrink-0" />
                    <div className="w-[50%] max-w-[250px] h-16 bg-background border border-border/50 rounded-2xl rounded-bl-sm animate-pulse" />
                </div>
                <div className="flex w-full items-end gap-2 justify-start opacity-50">
                    <div className="w-8 h-8 rounded-full bg-border animate-pulse shrink-0" />
                    <div className="w-[40%] max-w-[200px] h-10 bg-background border border-border/50 rounded-2xl rounded-bl-sm animate-pulse" />
                </div>
                <div className="flex w-full items-end gap-2 justify-end opacity-50">
                    <div className="w-[70%] max-w-[350px] h-20 bg-brand/30 rounded-2xl rounded-br-sm animate-pulse" />
                </div>
            </div>
        );
    }

    if (notFound || !conversation || !participant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-2">
                <p className="text-sm">
                    Conversation not found or access denied.
                </p>
            </div>
        );
    }

    const replyingSenderName =
        replyingTo?.senderId === currentUser?.id
            ? "You"
            : (
                  participantDirectory[replyingTo?.senderId ?? ""]
                      ?.displayName || participant.displayName
              )
                  .split(" ")
                  .slice(-1)[0];

    const isTyping = typingUserIds.size > 0;
    const typingUserId = Array.from(typingUserIds)[0];
    const typingDisplayName = typingUserId
        ? (
              participantDirectory[typingUserId]?.displayName ||
              participant.displayName
          )
              .split(" ")
              .slice(-1)[0]
        : participant.displayName.split(" ").slice(-1)[0];
    const profileUser =
        selectedProfileUser ??
        (conversation.type === "PRIVATE" ? participant : null);
    const showPhone = profileUser?.privacy?.showPhone !== false;
    const showDob = profileUser?.privacy?.showDob !== false;
    const groupMembers = Object.values(participantDirectory);
    const inviteLink = `https://chatly.app/group/${conversation.id}`;
    const canAddFriend =
        !!profileUser?.id &&
        profileUser.id !== currentUser?.id &&
        !["ACCEPTED", "PENDING"].includes(contactStatus ?? "");

    // Determine presence status for the other participant
    const isGroup = conversation.type === "GROUP";
    const participantPresence = !isGroup
        ? (presenceMap[participant.id] ?? undefined)
        : undefined;

    // Get local prefs (pin/mute status)
    const prefs = getPrefs(id);
    const isPinned = prefs.isPinned ?? conversation.isPinned ?? false;
    const isMuted = prefs.isMuted ?? conversation.isMuted ?? false;
    const nickname = prefs.nickname ?? conversation.nickname;

    return (
        <div className="flex-1 flex flex-row overflow-hidden">
        <div 
            className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-[#16191f] relative min-w-0"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag drop overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-brand m-2 rounded-xl transition-all pointer-events-none">
                    <div className="flex flex-col items-center gap-4 text-brand">
                        <Upload size={48} className="animate-bounce" />
                        <h3 className="text-2xl font-bold tracking-tight">Drop files here</h3>
                        <p className="text-muted-foreground">Supports images, videos, and documents</p>
                    </div>
                </div>
            )}

            <ChatHeader
                user={participant}
                onOpenProfile={() => {
                    setSelectedProfileUser(null);
                    setShowProfileDialog(true);
                }}
                isGroup={isGroup}
                onOpenGroupPanel={
                    isGroup ? () => setShowGroupPanel(true) : undefined
                }
                onToggleSearch={() => {
                    setShowSearch((prev) => !prev);
                    if (showSearch) setHighlightedMessageId(null);
                }}
                onToggleInfoPanel={() => setShowInfoPanel((prev) => !prev)}
                isInfoPanelOpen={showInfoPanel}
                presenceStatus={participantPresence?.status}
                lastSeen={participantPresence?.lastSeen}
                onBack={() => navigate("/chat")}
                isPinned={isPinned}
                isMuted={isMuted}
                nickname={nickname}
            />

            {/* ── Pinned Messages Banner (Zalo-style) ─────────────────────── */}
            {pinnedMessages.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-amber-50/80 dark:bg-amber-950/30 text-sm shrink-0">
                    <Pin size={13} className="text-amber-500 shrink-0" />
                    <button
                        type="button"
                        className="flex-1 text-left truncate text-foreground/90 hover:text-foreground transition-colors text-xs"
                        onClick={() => setHighlightedMessageId(pinnedMessages[currentPinnedIdx]?.id ?? null)}
                    >
                        <span className="font-medium text-amber-600 dark:text-amber-400 mr-1">Pinned</span>
                        {pinnedMessages[currentPinnedIdx]?.content ??
                            (pinnedMessages[currentPinnedIdx]?.type === "POLL"
                                ? `Poll: ${pinnedMessages[currentPinnedIdx]?.poll?.question}`
                                : "[attachment]")}
                    </button>
                    {pinnedMessages.length > 1 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setCurrentPinnedIdx((i) => (i - 1 + pinnedMessages.length) % pinnedMessages.length)}
                                className="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
                            >
                                <ChevronLeft size={13} />
                            </button>
                            <span className="text-[11px] text-muted-foreground">{currentPinnedIdx + 1}/{pinnedMessages.length}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentPinnedIdx((i) => (i + 1) % pinnedMessages.length)}
                                className="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        title="Unpin"
                        onClick={() => handleTogglePin(pinnedMessages[currentPinnedIdx]?.id)}
                        className="p-1 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40 shrink-0"
                    >
                        <PinOff size={13} className="text-amber-500" />
                    </button>
                    <button
                        type="button"
                        title="See all pinned"
                        onClick={() => setShowPinnedDialog(true)}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline shrink-0 font-medium"
                    >
                        All
                    </button>
                </div>
            )}

            {/* ── Active Poll Banner (Zalo-style) ──────────────────────────── */}
            {activePoll && !dismissedPollIds.has(activePoll.id) && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-brand/5 dark:bg-brand/10 text-sm shrink-0">
                    <BarChart3 size={13} className="text-brand shrink-0" />
                    <button
                        type="button"
                        className="flex-1 text-left truncate text-foreground/90 hover:text-foreground transition-colors text-xs"
                        onClick={() => setHighlightedMessageId(activePoll.id)}
                    >
                        <span className="font-medium text-brand mr-1">Poll:</span>
                        {activePoll.poll?.question}
                    </button>
                    <button
                        type="button"
                        onClick={() => setHighlightedMessageId(activePoll.id)}
                        className="text-[11px] text-brand hover:underline shrink-0 font-medium"
                    >
                        Vote
                    </button>
                    <button
                        type="button"
                        title="Dismiss"
                        onClick={() => setDismissedPollIds((prev) => new Set(prev).add(activePoll.id))}
                        className="p-1 rounded hover:bg-brand/10 shrink-0"
                    >
                        <XIcon size={13} className="text-muted-foreground" />
                    </button>
                </div>
            )}

            {showSearch && (
                <MessageSearch
                    conversationId={id}
                    onClose={() => {
                        setShowSearch(false);
                        setHighlightedMessageId(null);
                    }}
                    onNavigateToMessage={setHighlightedMessageId}
                />
            )}

            <MessageList
                messages={messages}
                participant={participant}
                conversationType={conversation.type}
                participantDirectory={messageUserDirectory}
                currentUserId={currentUser?.id ?? ""}
                onReply={handleReply}
                onForward={handleForward}
                onRecall={handleRecall}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
                onOpenSenderProfile={handleOpenSenderProfile}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                failedMessages={failedMessages}
                onRetryMessage={handleRetryMessage}
                onRemoveFailedMessage={(fid) => setFailedMessages((p) => p.filter(m => m.id !== fid))}
                highlightedMessageId={highlightedMessageId}
                onVotePoll={handleVotePoll}
                onClosePoll={handleClosePoll}
                onTogglePin={handleTogglePin}
                onTagPriority={handleTagPriority}
            />

            {isTyping && (
                <div className="absolute bottom-24 left-6 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                        <div className="flex gap-1">
                            <span
                                className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                            />
                            <span
                                className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                            />
                            <span
                                className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                            />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground italic">
                            {typingDisplayName} is typing...
                        </span>
                    </div>
                </div>
            )}

            <ChatInput
                ref={chatInputRef}
                conversationId={id}
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
                onSendMessage={handleSendMessage}
                onTyping={sendTyping}
                groupMembers={groupMembers}
                currentUserId={currentUser?.id}
            />

            <ForwardMessageDialog
                open={!!forwardingMessage}
                currentConversationId={id}
                currentUserId={currentUser?.id ?? ""}
                onOpenChange={(open) => {
                    if (!open) setForwardingMessage(null);
                }}
                onConfirm={handleForwardConfirm}
            />

            <PinnedMessagesDialog
                conversationId={id}
                open={showPinnedDialog}
                onOpenChange={setShowPinnedDialog}
                onUnpin={handleTogglePin}
                onScrollToMessage={setHighlightedMessageId}
            />

            <Dialog
                open={showProfileDialog}
                onOpenChange={(open) => {
                    setShowProfileDialog(open);
                    if (!open) setSelectedProfileUser(null);
                }}
            >
                <DialogContent
                    className={
                        conversation.type === "GROUP"
                            ? "sm:max-w-md border-border/70 bg-background dark:bg-[#1b1c1d]"
                            : "sm:max-w-md border-border/70"
                    }
                >
                    {profileUser ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>User Information</DialogTitle>
                                <DialogDescription>
                                    Profile visible based on privacy settings.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-14 w-14 border border-border/60">
                                        <AvatarImage
                                            src={profileUser.avatarUrl}
                                        />
                                        <AvatarFallback>
                                            {profileUser.displayName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-foreground truncate">
                                            {profileUser.displayName}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            @{profileUser.username || "unknown"}
                                        </p>
                                        {profileUser.id === participant.id &&
                                            !isGroup &&
                                            participantPresence && (
                                                <PresenceIndicator
                                                    status={
                                                        participantPresence.status
                                                    }
                                                    lastSeen={
                                                        participantPresence.lastSeen
                                                    }
                                                    showLabel
                                                    className="mt-1"
                                                />
                                            )}
                                    </div>
                                </div>
                                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                                            <Phone size={14} />
                                            Phone number
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {showPhone
                                                ? profileUser.phone ||
                                                  "Not updated"
                                                : "Hidden"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                                            <CalendarDays size={14} />
                                            Date of birth
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {showDob
                                                ? formatDob(profileUser.dob)
                                                : "Hidden"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {contactStatus === "ACCEPTED" && (
                                        <Badge variant="secondary">
                                            Already friends
                                        </Badge>
                                    )}
                                    {contactStatus === "PENDING" && (
                                        <Badge variant="outline">
                                            Request sent
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                {canAddFriend && (
                                    <Button
                                        onClick={handleSendFriendRequest}
                                        disabled={sendingContact}
                                        className="w-full sm:w-auto"
                                    >
                                        {sendingContact ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add Friend
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Group Information</DialogTitle>
                                <DialogDescription>
                                    Manage group info and members.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-muted/25 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="h-14 w-14 border border-border/60">
                                                <AvatarImage
                                                    src={
                                                        isEditingGroup
                                                            ? groupAvatarDraft ||
                                                              participant.avatarUrl
                                                            : participant.avatarUrl
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {(isEditingGroup
                                                        ? groupNameDraft
                                                        : participant.displayName
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase() || "N"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                {isEditingGroup ? (
                                                    <Input
                                                        value={groupNameDraft}
                                                        onChange={(e) =>
                                                            setGroupNameDraft(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Group Name"
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    <p className="text-base font-semibold text-foreground truncate">
                                                        {
                                                            participant.displayName
                                                        }
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Group Chat •{" "}
                                                    {groupMembers.length} members
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                setIsEditingGroup(
                                                    (prev) => !prev,
                                                )
                                            }
                                        >
                                            <Pencil size={14} />
                                        </Button>
                                    </div>

                                    {isEditingGroup && (
                                        <div className="mt-3 space-y-2">
                                            <input
                                                ref={groupAvatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleGroupAvatarFileChange}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                disabled={groupAvatarUploading}
                                                onClick={() => groupAvatarInputRef.current?.click()}
                                            >
                                                {groupAvatarUploading ? (
                                                    <><Loader2 size={14} className="mr-2 animate-spin" />Uploading image...</>
                                                ) : (
                                                    <><Upload size={14} className="mr-2" />{groupAvatarDraft ? "Change avatar" : "Select avatar"}</>
                                                )}
                                            </Button>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={groupProfileSaving}
                                                    onClick={() => {
                                                        setIsEditingGroup(false);
                                                        setGroupNameDraft(
                                                            participant.displayName ||
                                                                conversation.name ||
                                                                "Chat group",
                                                        );
                                                        setGroupAvatarDraft(
                                                            participant.avatarUrl ||
                                                                conversation.avatarUrl ||
                                                                "",
                                                        );
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={groupProfileSaving || groupAvatarUploading}
                                                    onClick={handleSaveGroupProfile}
                                                >
                                                    {groupProfileSaving ? <><Loader2 size={14} className="mr-1 animate-spin" />Saving...</> : "Save"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                                    <p className="text-sm font-semibold text-foreground">
                                        Members ({groupMembers.length})
                                    </p>
                                    <div className="flex items-center -space-x-2">
                                        {groupMembers
                                            .slice(0, 6)
                                            .map((member) => (
                                                <Avatar
                                                    key={member.id}
                                                    className="h-9 w-9 border-2 border-background"
                                                    title={member.displayName}
                                                >
                                                    <AvatarImage
                                                        src={member.avatarUrl}
                                                    />
                                                    <AvatarFallback>
                                                        {member.displayName.charAt(
                                                            0,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                        {groupMembers.length > 6 && (
                                            <div className="h-9 w-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[11px] text-muted-foreground font-semibold">
                                                +{groupMembers.length - 6}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-muted/20 p-3">
                                    <p className="text-sm font-medium text-foreground">
                                        Group Join Link
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <a
                                            href={inviteLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-brand hover:underline truncate"
                                        >
                                            {inviteLink}
                                        </a>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(
                                                        inviteLink,
                                                    );
                                                    toast.success(
                                                        "Group link copied",
                                                    );
                                                } catch {
                                                    toast.error(
                                                        "Could not copy link",
                                                    );
                                                }
                                            }}
                                        >
                                            <Copy size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            setShowProfileDialog(false);
                                            setShowGroupPanel(true);
                                        }}
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Group management
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        onClick={() =>
                                            toast.info(
                                                "Development in progress...",
                                            )
                                        }
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Leave group
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Group Management Panel */}
            {isGroup && (
                <GroupManagementPanel
                    conversationId={id}
                    open={showGroupPanel}
                    onOpenChange={setShowGroupPanel}
                    initialGroupName={conversation?.name ?? ""}
                    initialGroupAvatar={conversation?.avatarUrl ?? ""}
                    defaultTab={groupPanelDefaultTab}
                    onGroupUpdated={(name, avatarUrl) => {
                        setConversation((prev) =>
                            prev ? { ...prev, name, avatarUrl: avatarUrl ?? prev.avatarUrl } : prev,
                        );
                        setParticipant((prev) =>
                            prev ? { ...prev, displayName: name, avatarUrl: avatarUrl ?? prev.avatarUrl } : prev,
                        );
                    }}
                />
            )}

            {/* Create Group from private conversation */}
            <CreateGroupDialog
                open={createGroupFromPrivateOpen}
                onOpenChange={setCreateGroupFromPrivateOpen}
                onCreated={(conv) => {
                    navigate(`/chat/${conv.id}`);
                }}
            />
        </div>

            {/* Conversation Info Panel (right sidebar - toggleable on lg+) */}
            {showInfoPanel && (
            <ConversationInfoPanel
                conversation={conversation}
                participant={participant}
                currentUserId={currentUser?.id ?? ""}
                onDeleteConversation={() => navigate("/chat")}
                onOpenGroupPanel={isGroup ? () => { setGroupPanelDefaultTab("members"); setShowGroupPanel(true); } : undefined}
                onCreateGroup={!isGroup ? () => setCreateGroupFromPrivateOpen(true) : undefined}
                onNicknameChange={(nickname) => {
                    setParticipant((prev) => prev ? { ...prev, displayName: nickname } : prev);
                }}
                onGroupUpdated={(name, avatarUrl) => {
                    setConversation((prev) =>
                        prev ? { ...prev, name, avatarUrl: avatarUrl ?? prev.avatarUrl } : prev,
                    );
                    setParticipant((prev) =>
                        prev ? { ...prev, displayName: name, avatarUrl: avatarUrl ?? prev.avatarUrl } : prev,
                    );
                }}
                onConversationUpdate={(updated) => {
                    setConversation(updated);
                    onConversationUpdated?.(updated);
                }}
            />
            )}
        </div>
    );
});
