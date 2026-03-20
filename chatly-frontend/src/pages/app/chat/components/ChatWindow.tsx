import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { GroupManagementPanel } from "./GroupManagementPanel";
import { conversationService } from "@/services/conversation.service";
import { contactService } from "@/services/contact.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useChatSocket } from "@/hooks/useChatSocket";
import { usePresenceSocket, type PresenceEvent } from "@/hooks/usePresenceSocket";
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
} from "lucide-react";
import { toast } from "sonner";
import type { Message, ChatUser, ChatEvent } from "@/types/message";
import type { ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";

const PAGE_SIZE = 20;

interface ChatWindowProps {
    id: string;
}

function getPrivacyFlag(user: Record<string, unknown>, field: "phone" | "dob") {
    const privacy = user.privacy as Record<string, unknown> | undefined;
    const normalizeVisibility = (value: unknown) => {
        if (typeof value === "boolean") return value;
        if (typeof value !== "string") return undefined;

        const normalized = value.toLowerCase();
        if (normalized === "hidden" || normalized === "none" || normalized === "private") {
            return false;
        }
        if (normalized === "everyone" || normalized === "public" || normalized === "friends") {
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
    if (!dob) return "Chưa cập nhật";
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(parsed);
}

export function ChatWindow({ id }: ChatWindowProps) {
    const { user: currentUser } = useAuthStore();

    const [conversation, setConversation] = useState<ConversationResponse | null>(null);
    const [participant, setParticipant] = useState<ChatUser | null>(null);
    const [participantDirectory, setParticipantDirectory] = useState<Record<string, ChatUser>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    
    // Typing indicators
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

    // Phân trang load-more
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const currentPageRef = useRef(0);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [contactStatus, setContactStatus] = useState<ContactStatus | null>(null);
    const [sendingContact, setSendingContact] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupNameDraft, setGroupNameDraft] = useState("");
    const [groupAvatarDraft, setGroupAvatarDraft] = useState("");
    const [showGroupPanel, setShowGroupPanel] = useState(false);
    const [selectedProfileUser, setSelectedProfileUser] = useState<ChatUser | null>(null);
    // Presence tracking
    const [presenceMap, setPresenceMap] = useState<Record<string, { status: string; lastSeen: string | null }>>({});


    // ----------------------------------------------------------------
    // 1. WebSocket Hook Integration
    // ----------------------------------------------------------------
    const onEvent = useCallback((event: ChatEvent) => {
        const { action, message: msg } = event;

        if (action === "SEND") {
            setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            if (msg.senderId !== currentUser?.id) {
                sendSeen(msg.id);
            }
        } else if (action === "EDIT" || action === "RECALL") {
            setMessages((prev) =>
                prev.map(m => m.id === msg.id ? { ...m, ...msg } : m)
            );
        } else if (action === "DELETE") {
            setMessages((prev) => prev.filter(m => m.id !== msg.id));
        }
    }, [currentUser?.id]);

    const onTyping = useCallback((data: { userId: string; typing: boolean }) => {
        if (data.userId === currentUser?.id) return;
        setTypingUserIds((prev) => {
            const next = new Set(prev);
            if (data.typing) next.add(data.userId);
            else next.delete(data.userId);
            return next;
        });
    }, [currentUser?.id]);

    const onRead = useCallback((msg: Message) => {
        setMessages((prev) => 
            prev.map(m => m.id === msg.id ? { ...m, status: msg.status, readBy: msg.readBy } : m)
        );
    }, []);

    const { sendMessage, sendTyping, sendSeen } = useChatSocket({
        conversationId: id,
        onEvent,
        onTyping,
        onRead
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

                // Fetch conversation detail và tất cả users song song
                const [convRes, usersRes, contactsRes] = await Promise.all([
                    conversationService.getById(id),
                    userService.getAll(),
                    contactService.getAll().catch(() => ({ result: [] })),
                ]);
                if (cancelled) return;

                const conv = convRes.result;
                setConversation(conv);

                // Lấy thông tin participant hiển thị
                const allUsers = usersRes.result ?? [];
                const allContacts = contactsRes.result ?? [];
                const directory = Object.fromEntries(
                    conv.participantIds.map((participantId) => {
                        const foundUser = allUsers.find((u) => u.id === participantId);
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
                                  displayName: "Người dùng",
                                  username: "",
                              };
                        return [participantId, mapped];
                    }),
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
                                  privacy: {
                                      showPhone: getPrivacyFlag(otherRecord, "phone"),
                                      showDob: getPrivacyFlag(otherRecord, "dob"),
                                  },
                              }
                            : {
                                  id: otherId ?? "",
                                  displayName: "Người dùng",
                                  username: "",
                              },
                    );

                    const relation = allContacts.find(
                        (c) =>
                            (c.user.id === currentUser.id && c.contact.id === otherId) ||
                            (c.user.id === otherId && c.contact.id === currentUser.id),
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
                        displayName: conv.name ?? "Nhóm chat",
                        username: "group",
                        avatarUrl: conv.avatarUrl ?? firstMemberWithAvatar?.avatarUrl,
                    });
                    setContactStatus(null);
                }

                // Fetch trang đầu messages
                const msgRes = await messageService.getByConversation(id, 0, PAGE_SIZE);
                if (cancelled) return;

                const fetched = msgRes.result ?? [];
                setMessages([...fetched].reverse());
                setHasMore(fetched.length === PAGE_SIZE);
                
                // Đánh dấu các tin nhắn chưa đọc là seen
                fetched.forEach(m => {
                    if (m.senderId !== currentUser.id && m.status !== "READ") {
                        sendSeen(m.id);
                    }
                });
            } catch (err) {
                console.error("Lỗi load conversation:", err);
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
    // 3. Load thêm tin nhắn cũ khi kéo lên trên
    // ----------------------------------------------------------------
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        try {
            setIsLoadingMore(true);
            const nextPage = currentPageRef.current + 1;
            const res = await messageService.getByConversation(id, nextPage, PAGE_SIZE);
            const fetched = res.result ?? [];

            setMessages((prev) => [...[...fetched].reverse(), ...prev]);
            currentPageRef.current = nextPage;
            setHasMore(fetched.length === PAGE_SIZE);
        } catch (err) {
            console.error("Lỗi load thêm tin nhắn:", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [id, isLoadingMore, hasMore]);

    // ----------------------------------------------------------------
    // 4. Handlers: Gửi tin nhắn, Reply, Recall, Edit
    // ----------------------------------------------------------------
    const handleSendMessage = useCallback((content: string) => {
        if (!id || !currentUser) return;
        sendMessage(content, replyingTo?.id ?? null);
        setReplyingTo(null);
    }, [id, currentUser, replyingTo, sendMessage]);

    const handleReply = useCallback((msg: Message) => setReplyingTo(msg), []);
    const handleCancelReply = useCallback(() => setReplyingTo(null), []);

    const handleRecall = useCallback(async (messageId: string) => {
        try {
            await messageService.recall(messageId);
            // Optimistic update (WebSocket will also broadcast it)
            setMessages((prev) =>
                prev.map(m =>
                    m.id === messageId
                        ? { ...m, recalled: true, recalledAt: new Date().toISOString(), recalledBy: currentUser?.id ?? null }
                        : m
                )
            );
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? "Không thể thu hồi tin nhắn";
            toast.error(msg);
        }
    }, [currentUser?.id]);

    const handleEdit = useCallback(async (messageId: string, newContent: string) => {
        try {
            await messageService.edit(messageId, newContent);
            // Optimistic update (WebSocket will also broadcast it)
            setMessages((prev) =>
                prev.map(m =>
                    m.id === messageId
                        ? { ...m, content: newContent, edited: true, editedAt: new Date().toISOString() }
                        : m
                )
            );
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? "Không thể chỉnh sửa tin nhắn";
            toast.error(msg);
        }
    }, []);

    const handleOpenSenderProfile = useCallback(
        (senderId: string) => {
            const user = participantDirectory[senderId];
            if (!user) return;
            setSelectedProfileUser(user);
            setShowProfileDialog(true);
        },
        [participantDirectory],
    );

    const handleSendFriendRequest = useCallback(async () => {
        const targetUser =
            selectedProfileUser ?? (conversation?.type === "PRIVATE" ? participant : null);
        if (!targetUser) return;
        if (contactStatus === "ACCEPTED" || contactStatus === "PENDING") return;

        try {
            setSendingContact(true);
            await contactService.sendRequest({ contactId: targetUser.id });
            setContactStatus("PENDING");
            toast.success("Đã gửi lời mời kết bạn");
        } catch (error) {
            toast.error("Không thể gửi lời mời kết bạn");
        } finally {
            setSendingContact(false);
        }
    }, [selectedProfileUser, conversation?.type, participant, contactStatus]);

    useEffect(() => {
        if (!showProfileDialog || conversation?.type !== "GROUP" || !participant) {
            setIsEditingGroup(false);
            return;
        }

        setGroupNameDraft(participant.displayName || conversation.name || "Nhóm chat");
        setGroupAvatarDraft(participant.avatarUrl || conversation.avatarUrl || "");
    }, [showProfileDialog, conversation?.type, conversation?.name, conversation?.avatarUrl, participant?.displayName, participant?.avatarUrl]);

    const handleSaveGroupProfile = useCallback(() => {
        if (conversation?.type !== "GROUP") return;

        const nextName = groupNameDraft.trim();
        if (!nextName) {
            toast.error("Tên nhóm không được để trống");
            return;
        }

        const nextAvatar = groupAvatarDraft.trim();

        setParticipant((prev) =>
            prev
                ? {
                      ...prev,
                      displayName: nextName,
                      avatarUrl: nextAvatar || undefined,
                  }
                : prev,
        );

        setConversation((prev) =>
            prev
                ? {
                      ...prev,
                      name: nextName,
                      avatarUrl: nextAvatar || null,
                  }
                : prev,
        );

        setIsEditingGroup(false);
        toast.success("Đã cập nhật thông tin nhóm");
    }, [conversation?.type, groupAvatarDraft, groupNameDraft]);

    // ----------------------------------------------------------------
    // Render states
    // ----------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted/60 animate-pulse" />
                <div className="space-y-2 flex flex-col items-center">
                    <div className="h-3 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                </div>
            </div>
        );
    }

    if (notFound || !conversation || !participant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-2">
                <p className="text-sm">Hội thoại không tồn tại hoặc bạn không có quyền truy cập.</p>
            </div>
        );
    }

    const replyingSenderName =
        replyingTo?.senderId === currentUser?.id
            ? "Bạn"
            : (
                  participantDirectory[replyingTo?.senderId ?? ""]?.displayName ||
                  participant.displayName
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
    const profileUser = selectedProfileUser ?? (conversation.type === "PRIVATE" ? participant : null);
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
        ? presenceMap[participant.id] ?? undefined
        : undefined;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
            <ChatHeader
                user={participant}
                onOpenProfile={() => {
                    setSelectedProfileUser(null);
                    setShowProfileDialog(true);
                }}
                isGroup={isGroup}
                onOpenGroupPanel={isGroup ? () => setShowGroupPanel(true) : undefined}
                presenceStatus={participantPresence?.status}
                lastSeen={participantPresence?.lastSeen}
            />

            <MessageList
                messages={messages}
                participant={participant}
                conversationType={conversation.type}
                participantDirectory={participantDirectory}
                currentUserId={currentUser?.id ?? ""}
                onReply={handleReply}
                onRecall={handleRecall}
                onEdit={handleEdit}
                onOpenSenderProfile={handleOpenSenderProfile}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
            />

            {isTyping && (
                <div className="absolute bottom-24 left-6 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground italic">
                            {typingDisplayName} đang soạn tin...
                        </span>
                    </div>
                </div>
            )}

            <ChatInput
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
                onSendMessage={handleSendMessage}
                onTyping={sendTyping}
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
                                <DialogTitle>Thông tin người dùng</DialogTitle>
                                <DialogDescription>
                                    Hồ sơ hiển thị theo quyền riêng tư của người này.
                                </DialogDescription>
                            </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 border border-border/60">
                                <AvatarImage src={profileUser.avatarUrl} />
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
                                {profileUser.id === participant.id && !isGroup && participantPresence && (
                                    <PresenceIndicator
                                        status={participantPresence.status}
                                        lastSeen={participantPresence.lastSeen}
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
                                            Số điện thoại
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {showPhone
                                                ? profileUser.phone || "Chưa cập nhật"
                                                : "Đã ẩn"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                                            <CalendarDays size={14} />
                                            Ngày sinh
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {showDob ? formatDob(profileUser.dob) : "Đã ẩn"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {contactStatus === "ACCEPTED" && (
                                        <Badge variant="secondary">Đã là bạn bè</Badge>
                                    )}
                                    {contactStatus === "PENDING" && (
                                        <Badge variant="outline">Đã gửi lời mời</Badge>
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
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Kết bạn
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Thông tin nhóm</DialogTitle>
                                <DialogDescription>
                                    Quản lý nhanh thông tin và thành viên nhóm.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-muted/25 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="h-14 w-14 border border-border/60">
                                                <AvatarImage
                                                    src={isEditingGroup ? groupAvatarDraft || participant.avatarUrl : participant.avatarUrl}
                                                />
                                                <AvatarFallback>
                                                    {(isEditingGroup ? groupNameDraft : participant.displayName)
                                                        .charAt(0)
                                                        .toUpperCase() || "N"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                {isEditingGroup ? (
                                                    <Input
                                                        value={groupNameDraft}
                                                        onChange={(e) => setGroupNameDraft(e.target.value)}
                                                        placeholder="Tên nhóm"
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    <p className="text-base font-semibold text-foreground truncate">
                                                        {participant.displayName}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Nhóm chat • {groupMembers.length} thành viên
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setIsEditingGroup((prev) => !prev)}
                                        >
                                            <Pencil size={14} />
                                        </Button>
                                    </div>

                                    {isEditingGroup && (
                                        <div className="mt-3 space-y-2">
                                            <Input
                                                value={groupAvatarDraft}
                                                onChange={(e) => setGroupAvatarDraft(e.target.value)}
                                                placeholder="URL ảnh nhóm"
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsEditingGroup(false);
                                                        setGroupNameDraft(participant.displayName || conversation.name || "Nhóm chat");
                                                        setGroupAvatarDraft(participant.avatarUrl || conversation.avatarUrl || "");
                                                    }}
                                                >
                                                    Huỷ
                                                </Button>
                                                <Button size="sm" onClick={handleSaveGroupProfile}>
                                                    Lưu
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                                    <p className="text-sm font-semibold text-foreground">
                                        Thành viên ({groupMembers.length})
                                    </p>
                                    <div className="flex items-center -space-x-2">
                                        {groupMembers.slice(0, 6).map((member) => (
                                            <Avatar
                                                key={member.id}
                                                className="h-9 w-9 border-2 border-background"
                                                title={member.displayName}
                                            >
                                                <AvatarImage src={member.avatarUrl} />
                                                <AvatarFallback>
                                                    {member.displayName.charAt(0)}
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
                                    <p className="text-sm font-medium text-foreground">Link tham gia nhóm</p>
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
                                                    await navigator.clipboard.writeText(inviteLink);
                                                    toast.success("Đã sao chép link nhóm");
                                                } catch {
                                                    toast.error("Không thể sao chép link");
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
                                        Quản lý nhóm
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        onClick={() => toast.info("Development in progress...")}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Rời nhóm
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
                />
            )}
        </div>
    );
}
