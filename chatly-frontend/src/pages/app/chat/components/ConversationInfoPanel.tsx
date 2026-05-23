import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    BellOff,
    Bell,
    Pin,
    PinOff,
    UserPlus,
    Pencil,
    Trash2,
    Image,
    FileText,
    Link as LinkIcon,
    ChevronDown,
    Check,
    Settings,
    X,
    Users,
    Loader2,
    Download,
    Copy,
    RefreshCw,
    QrCode,
    LogOut,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AddMembersDialog } from "./AddMembersDialog";
import { SharedMediaDialog } from "./SharedMediaDialog";
import { NotesDialog } from "./NotesDialog";
import { PinnedMessagesDialog } from "./PinnedMessagesDialog";
import { RemindersDialog } from "./RemindersDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Attachment, ChatUser, Message } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";
import { conversationService } from "@/services/conversation.service";
import { groupService } from "@/services/group.service";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { messageService } from "@/services/message.service";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import { useNotificationStore } from "@/store/notification.store";

interface ConversationInfoPanelProps {
    conversation: ConversationResponse;
    participant: ChatUser;
    currentUserId: string;
    messages: Message[];
    onDeleteConversation: () => void;
    onOpenGroupPanel?: () => void;
    onOpenGroupSettingsPanel?: () => void;
    onCreateGroup?: () => void;
    onNicknameChange?: (nickname: string) => void;
    onGroupUpdated?: (name: string, avatarUrl?: string) => void;
    onConversationUpdate?: (updated: ConversationResponse) => void;
}

const MUTE_OPTIONS = [
    { value: "1h", label: "1 hour", duration: 1 * 60 * 60 * 1000 },
    { value: "4h", label: "4 hours", duration: 4 * 60 * 60 * 1000 },
    { value: "8h", label: "8 hours", duration: 8 * 60 * 60 * 1000 },
    { value: "forever", label: "Until I turn it back on", duration: null },
] as const;

function attachmentToFile(
    attachment: Attachment,
    message: Message,
): FileUploadResponse {
    return {
        fileId: attachment.fileId ?? `${message.id}-${attachment.url}`,
        provider: "message",
        url: attachment.url,
        fileName: attachment.name ?? "Attachment",
        fileType: attachment.type ?? "application/octet-stream",
        fileSize: attachment.size ?? 0,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
    };
}

function isGifOrStickerMessage(message: Message): boolean {
    return message.type === "GIF" || message.type === "STICKER";
}

function isSharedMediaType(fileType?: string): boolean {
    if (!fileType || fileType === "image/gif") {
        return false;
    }
    return fileType.startsWith("image/") || fileType.startsWith("video/");
}

function messageToMediaFiles(message: Message): FileUploadResponse[] {
    if (isGifOrStickerMessage(message)) {
        return [];
    }

    return message.attachments
        .filter((attachment) => isSharedMediaType(attachment.type))
        .map((attachment) => attachmentToFile(attachment, message));
}

function messageToDocFiles(message: Message): FileUploadResponse[] {
    return message.attachments
        .filter((attachment) => {
            const type = attachment.type ?? "";
            return Boolean(attachment.url)
                && !type.startsWith("image/")
                && !type.startsWith("video/")
                && !type.startsWith("audio/")
                && attachment.kind !== "POST_PREVIEW"
                && attachment.kind !== "REEL_PREVIEW"
                && attachment.kind !== "STORY_REPLY";
        })
        .map((attachment) => attachmentToFile(attachment, message));
}

function mergeFiles(
    fetchedFiles: FileUploadResponse[],
    liveFiles: FileUploadResponse[],
): FileUploadResponse[] {
    const byKey = new Map<string, FileUploadResponse>();
    [...liveFiles, ...fetchedFiles].forEach((file) => {
        byKey.set(file.fileId || file.url, file);
    });
    return [...byKey.values()].sort(
        (left, right) =>
            new Date(right.createdAt ?? 0).getTime() -
            new Date(left.createdAt ?? 0).getTime(),
    );
}

function extractLinksFromMessages(messages: Message[]): { url: string; domain: string }[] {
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const links: { url: string; domain: string }[] = [];
    messages.forEach((message) => {
        if (message.type === "GIF" || message.type === "STICKER") return;
        const matches = message.content?.match(urlRegex) ?? [];
        matches.forEach((url) => {
            try {
                links.push({ url, domain: new URL(url).hostname });
            } catch {
                // Ignore malformed URLs in plain text messages.
            }
        });
    });
    return links;
}

function mergeLinks(
    fetchedLinks: { url: string; domain: string }[],
    liveLinks: { url: string; domain: string }[],
): { url: string; domain: string }[] {
    const byUrl = new Map<string, { url: string; domain: string }>();
    [...liveLinks, ...fetchedLinks].forEach((link) => byUrl.set(link.url, link));
    return [...byUrl.values()].slice(0, 20);
}

export function ConversationInfoPanel({
    conversation,
    participant,
    currentUserId,
    messages,
    onDeleteConversation,
    onOpenGroupPanel,
    onCreateGroup,
    onNicknameChange,
    onGroupUpdated,
    onConversationUpdate: _onConversationUpdate,
}: ConversationInfoPanelProps) {
    const navigate = useNavigate();
    const isGroup = conversation.type === "GROUP";

    const { getPrefs, setPin, setMute, setNickname: storeSetNickname } = useConversationPrefsStore();
    const localPrefs = getPrefs(conversation.id);

    // Local prefs override server prefs
    const isMuted = localPrefs.isMuted ?? !!conversation.isMuted;
    const isPinned = localPrefs.isPinned ?? !!conversation.isPinned;
    const storedNickname = localPrefs.nickname ?? conversation.nickname;

    const [isDeleting, setIsDeleting] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

    // Fetch current user's role in group to determine owner status
    useEffect(() => {
        if (!isGroup) return;
        groupService.getMembers(conversation.id).then((res) => {
            if (res.code === 1000) {
                const me = res.result.find((m) => m.userId === currentUserId);
                setIsOwner(me?.role === "OWNER");
                setIsOwnerOrAdmin(me?.role === "OWNER" || me?.role === "ADMIN");
            }
        }).catch(() => {});
    }, [isGroup, conversation.id, currentUserId]);

    // Mute duration dialog
    const [showMuteDialog, setShowMuteDialog] = useState(false);
    const [muteDuration, setMuteDuration] = useState<string>("1h");

    // Nickname editing
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nicknameDraft, setNicknameDraft] = useState(storedNickname || participant.displayName);

    // Add members dialog (group only)
    const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);

    // Shared media dialog
    const [sharedMediaOpen, setSharedMediaOpen] = useState(false);
    const [sharedMediaTab, setSharedMediaTab] = useState<"media" | "files" | "links">("media");

    // Media & files from S3
    const [mediaFiles, setMediaFiles] = useState<FileUploadResponse[]>([]);
    const [docFiles, setDocFiles] = useState<FileUploadResponse[]>([]);
    const [linkMessages, setLinkMessages] = useState<{ url: string; domain: string }[]>([]);

    const liveMediaFiles = useMemo(
        () => mergeFiles(mediaFiles, messages.flatMap(messageToMediaFiles)),
        [mediaFiles, messages],
    );
    const liveDocFiles = useMemo(
        () => mergeFiles(docFiles, messages.flatMap(messageToDocFiles)),
        [docFiles, messages],
    );
    const liveLinkMessages = useMemo(
        () => mergeLinks(linkMessages, extractLinksFromMessages(messages)),
        [linkMessages, messages],
    );

    useEffect(() => {
        let cancelled = false;
        const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
        const fetchFiles = async () => {
            try {
                const [images, docs, linkMsgs] = await Promise.all([
                    fileService.getByConversation(conversation.id, "image"),
                    fileService.getByConversation(conversation.id, "file"),
                    messageService.search(conversation.id, "http", 0, 50).catch(() => ({ result: [] })),
                ]);
                if (!cancelled) {
                        setMediaFiles(images.filter((file) => isSharedMediaType(file.fileType)));
                    setDocFiles(docs);
                    const extracted: { url: string; domain: string }[] = [];
                    for (const msg of linkMsgs.result) {
                        if (msg.type === "GIF" || msg.type === "STICKER") continue;
                        const matches = msg.content?.match(URL_REGEX) ?? [];
                        for (const url of matches) {
                            try {
                                const domain = new URL(url).hostname;
                                if (!extracted.find(l => l.url === url)) {
                                    extracted.push({ url, domain });
                                }
                            } catch { /* ignore */ }
                        }
                    }
                    setLinkMessages(extracted.slice(0, 20));
                }
            } catch {
                // silently ignore
            }
        };
        fetchFiles();
        return () => { cancelled = true; };
    }, [conversation.id, conversation.lastMessage?.timestamp]);

    // Group name editing (group only)
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [groupNameDraft, setGroupNameDraft] = useState(participant.displayName);
    const [groupNameSaving, setGroupNameSaving] = useState(false);

    // Group avatar upload (group only)
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Collapsible sections (group only)
    const [membersExpanded, setMembersExpanded] = useState(true);
    const [boardExpanded, setBoardExpanded] = useState(false);

    // Bulletin board dialogs
    const [showNotes, setShowNotes] = useState(false);
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);
    const [showReminders, setShowReminders] = useState(false);

    // Invite link
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [inviteLinkExpanded, setInviteLinkExpanded] = useState(false);

    // Pending join requests count — reactive via notification store
    const [pendingCount, setPendingCount] = useState(0);
    const notifications = useNotificationStore((s) => s.notifications);
    const joinRequestCount = useMemo(
        () => notifications.filter((n) => n.type === "GROUP_JOIN_REQUEST" && n.referenceId === conversation.id).length,
        [notifications, conversation.id],
    );
    useEffect(() => {
        if (!isGroup || !isOwnerOrAdmin) return;
        let cancelled = false;
        groupService.getPendingRequests(conversation.id).then((res) => {
            if (!cancelled) setPendingCount(res.result?.length ?? 0);
        }).catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, [isGroup, isOwnerOrAdmin, conversation.id, joinRequestCount]);

    // Invite link handlers
    const fetchInviteLink = useCallback(async () => {
        if (!isGroup) return;
        setInviteLinkLoading(true);
        try {
            const res = await groupService.getOrCreateInviteLink(conversation.id);
            if (res.result) {
                setInviteLink(`${import.meta.env.VITE_WEB_BASE_URL || window.location.origin}/join/${res.result.inviteToken}`);
            }
        } catch { /* silent */ } finally { setInviteLinkLoading(false); }
    }, [isGroup, conversation.id]);

    const handleResetInviteLink = async () => {
        setInviteLinkLoading(true);
        try {
            const res = await groupService.resetInviteLink(conversation.id);
            if (res.result) {
                setInviteLink(`${import.meta.env.VITE_WEB_BASE_URL || window.location.origin}/join/${res.result.inviteToken}`);
            }
            toast.success("Invite link reset");
        } catch { toast.error("Could not reset invite link"); }
        finally { setInviteLinkLoading(false); }
    };

    const handleCopyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast.success("Invite link copied");
        }
    };

    useEffect(() => {
        if (isGroup && inviteLinkExpanded && !inviteLink) {
            fetchInviteLink();
        }
    }, [isGroup, inviteLinkExpanded, inviteLink, fetchInviteLink]);

    const handleOpenMute = () => {
        if (isMuted) {
            setMute(conversation.id, false);
            toast.success("Notifications turned on");
            return;
        }
        setShowMuteDialog(true);
    };

    const handleConfirmMute = () => {
        const option = MUTE_OPTIONS.find((o) => o.value === muteDuration);
        const mutedUntil = option?.duration
            ? new Date(Date.now() + option.duration).toISOString()
            : null;
        setMute(conversation.id, true, mutedUntil);
        setShowMuteDialog(false);
        toast.success(`Notifications silenced · ${option?.label ?? ""}`);
    };

    const handleTogglePin = () => {
        const pinnedConvs = Object.entries(useConversationPrefsStore.getState().prefs)
            .filter(([, p]) => p.isPinned);
        if (!isPinned && pinnedConvs.length >= 5) {
            toast.warning("You can only pin up to 5 conversations");
            return;
        }
        setPin(conversation.id, !isPinned);
        toast.success(isPinned ? "Conversation unpinned" : "Conversation pinned");
    };

    const handleSaveNickname = () => {
        const trimmed = nicknameDraft.trim();
        if (!trimmed) return;
        storeSetNickname(conversation.id, trimmed);
        onNicknameChange?.(trimmed);
        setIsEditingNickname(false);
        toast.success("Nickname set");
    };

    const handleSaveGroupName = async () => {
        const trimmed = groupNameDraft.trim();
        if (!trimmed) return;
        setGroupNameSaving(true);
        try {
            await groupService.updateGroup(conversation.id, { name: trimmed });
            // Refetch to update ChatList
            const updated = await conversationService.getById(conversation.id);
            onGroupUpdated?.(trimmed, participant.avatarUrl);
            if (updated.result) {
                _onConversationUpdate?.(updated.result);
            }
            setIsEditingGroupName(false);
            toast.success("Group name changed");
        } catch {
            toast.error("Could not change group name");
        } finally {
            setGroupNameSaving(false);
        }
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        try {
            const res = await fileService.upload(file);
            await groupService.updateGroup(conversation.id, { avatar: res.url });
            // Refetch to update ChatList
            const updated = await conversationService.getById(conversation.id);
            onGroupUpdated?.(participant.displayName, res.url);
            if (updated.result) {
                _onConversationUpdate?.(updated.result);
            }
            toast.success("Group avatar updated");
        } catch {
            toast.error("Could not update group avatar");
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this conversation?")) return;
        try {
            setIsDeleting(true);
            await conversationService.delete(conversation.id);
            onDeleteConversation();
            navigate("/chat");
            toast.success("Conversation deleted");
        } catch {
            toast.error("Could not delete conversation. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDissolve = async () => {
        if (!window.confirm("Are you sure you want to dissolve this group? This action cannot be undone.")) return;
        try {
            setIsDismissing(true);
            await conversationService.dissolve(conversation.id);
            onDeleteConversation();
            navigate("/chat");
            toast.success("Group dissolved");
        } catch {
            toast.error("Could not dissolve group. Please try again.");
        } finally {
            setIsDismissing(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            setIsLeaving(true);
            await groupService.removeMember(conversation.id, currentUserId);
            onDeleteConversation();
            navigate("/chat");
            toast.success("You have left the group");
        } catch {
            toast.error("Could not leave group. Please try again.");
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <aside className="hidden lg:flex flex-col h-full w-[300px] xl:w-[320px] shrink-0 border-l border-border bg-background dark:bg-[#22252b] overflow-hidden">
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold text-foreground">
                    {isGroup ? "Group Information" : "Conversation Information"}
                </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0 [&>[data-slot=scroll-area-viewport]]:overflow-x-hidden">
                <div className="flex flex-col gap-0">
                    {/* Avatar + Name */}
                    <div className="flex flex-col items-center gap-2 py-5 px-4">
                        <div className="relative">
                            {isGroup && (
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarFileChange}
                                />
                            )}
                            <Avatar
                                className={cn("h-16 w-16 border-2 border-border/50", isGroup && "cursor-pointer")}
                                onClick={isGroup ? () => avatarInputRef.current?.click() : undefined}
                            >
                                <AvatarImage src={participant.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-2xl font-semibold bg-muted">
                                    {participant.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {isGroup && (
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    className="absolute -bottom-1 -right-1 h-6 w-6 bg-muted border border-border rounded-full flex items-center justify-center hover:bg-muted/80 transition disabled:opacity-50"
                                >
                                    {avatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />}
                                </button>
                            )}
                        </div>
                        {/* Name + nickname/group name edit */}
                        {isEditingNickname && !isGroup ? (
                            <div className="flex items-center gap-1.5 px-2">
                                <Input
                                    value={nicknameDraft}
                                    onChange={(e) => setNicknameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveNickname();
                                        if (e.key === "Escape") {
                                            setIsEditingNickname(false);
                                            setNicknameDraft(storedNickname || participant.displayName);
                                        }
                                    }}
                                    className="h-7 text-sm text-center"
                                    autoFocus
                                />
                                <button type="button" onClick={handleSaveNickname} className="text-brand hover:text-brand/80">
                                    <Check size={15} />
                                </button>
                                <button type="button" onClick={() => { setIsEditingNickname(false); setNicknameDraft(storedNickname || participant.displayName); }} className="text-muted-foreground hover:text-foreground">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : isEditingGroupName && isGroup ? (
                            <div className="flex items-center gap-1.5 px-2">
                                <Input
                                    value={groupNameDraft}
                                    onChange={(e) => setGroupNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveGroupName();
                                        if (e.key === "Escape") {
                                            setIsEditingGroupName(false);
                                            setGroupNameDraft(participant.displayName);
                                        }
                                    }}
                                    className="h-7 text-sm text-center"
                                    autoFocus
                                    disabled={groupNameSaving}
                                />
                                <button type="button" onClick={handleSaveGroupName} disabled={groupNameSaving} className="text-brand hover:text-brand/80 disabled:opacity-50">
                                    {groupNameSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                </button>
                                <button type="button" onClick={() => { setIsEditingGroupName(false); setGroupNameDraft(participant.displayName); }} className="text-muted-foreground hover:text-foreground">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[15px] font-semibold text-foreground text-center leading-tight truncate max-w-full">
                                    {storedNickname || participant.displayName}
                                </span>
                                {!isGroup && participant.role === "ADMIN" && (
                                    <AdminBadge className="size-3.5" />
                                )}
                                {!isGroup ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNicknameDraft(storedNickname || participant.displayName);
                                            setIsEditingNickname(true);
                                        }}
                                        className="shrink-0 text-muted-foreground hover:text-foreground transition"
                                        title="Set nickname"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGroupNameDraft(participant.displayName);
                                            setIsEditingGroupName(true);
                                        }}
                                        className="shrink-0 text-muted-foreground hover:text-foreground transition"
                                        title="Change group name"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-start justify-center gap-3 px-4 pb-4">
                        {/* Mute */}
                        <button
                            type="button"
                            className="flex flex-col items-center gap-1.5 group"
                            onClick={handleOpenMute}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                isMuted
                                    ? "bg-brand/15 text-brand"
                                    : "bg-muted text-foreground group-hover:bg-muted/70"
                            )}>
                                {isMuted ? <Bell size={18} /> : <BellOff size={18} />}
                            </div>
                            <span className="text-[11px] text-muted-foreground text-center leading-tight max-w-[60px]">
                                {isMuted ? "Turn on\nnotifications" : "Turn off\nnotifications"}
                            </span>
                        </button>

                        {/* Pin */}
                        <button
                            type="button"
                            className="flex flex-col items-center gap-1.5 group"
                            onClick={handleTogglePin}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                isPinned
                                    ? "bg-brand/15 text-brand"
                                    : "bg-muted text-foreground group-hover:bg-muted/70"
                            )}>
                                {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                            </div>
                            <span className="text-[11px] text-muted-foreground text-center leading-tight max-w-[60px]">
                                {isPinned ? "Unpin" : "Pin\nconversation"}
                            </span>
                        </button>

                        {/* Add member (GROUP) or Create group (PRIVATE) */}
                        {isGroup ? (
                            <button
                                type="button"
                                className="flex flex-col items-center gap-1.5 group"
                                onClick={() => setShowAddMembersDialog(true)}
                            >
                                <div className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center transition-colors group-hover:bg-muted/70">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-[11px] text-muted-foreground text-center leading-tight max-w-[60px]">
                                    Add{"\n"}member
                                </span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="flex flex-col items-center gap-1.5 group"
                                onClick={onCreateGroup}
                            >
                                <div className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center transition-colors group-hover:bg-muted/70">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-[11px] text-muted-foreground text-center leading-tight max-w-[60px]">
                                    Create group chat
                                </span>
                            </button>
                        )}

                        {/* Manage group (GROUP only) */}
                        {isGroup && onOpenGroupPanel && (
                            <button
                                type="button"
                                className="flex flex-col items-center gap-1.5 group"
                                onClick={onOpenGroupPanel}
                            >
                                <div className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center transition-colors group-hover:bg-muted/70">
                                    <Settings size={18} />
                                </div>
                                <span className="text-[11px] text-muted-foreground text-center leading-tight max-w-[60px]">
                                    Group management
                                </span>
                            </button>
                        )}
                    </div>

                    <Separator />

                    {/* Group members section */}
                    {isGroup && (
                        <>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
                                onClick={() => setMembersExpanded((v) => !v)}
                            >
                                <span className="text-sm font-medium text-foreground">Group members</span>
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        "text-muted-foreground transition-transform",
                                        membersExpanded && "rotate-180",
                                    )}
                                />
                            </button>
                            {membersExpanded && (
                                <div className="px-4 py-3 bg-muted/20">
                                    <div className="flex items-center gap-2 text-sm">
                                    <button
                                        type="button"
                                        className=" text-brand flex items-center gap-1"
                                        onClick={onOpenGroupPanel}
                                    >
                                        <Users size={16} className="text-muted-foreground" />
                                        <span className="text-muted-foreground">{conversation.participantIds.length} members</span>
                                    </button>
                                    </div>
                                </div>
                            )}
                            <Separator />

                            {/* Pending join requests — always visible so realtime badge updates in-place */}
                            {onOpenGroupPanel && (
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
                                    onClick={onOpenGroupPanel}
                                >
                                    <div className="flex items-center gap-2">
                                        <UserPlus size={16} className="text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">Pending requests</span>
                                    </div>
                                    {pendingCount > 0 && (
                                        <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-5 text-center">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Group invite link */}
                            <div className="px-4 py-3">
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full"
                                    onClick={() => setInviteLinkExpanded((v) => !v)}
                                >
                                    <div className="flex items-center gap-2">
                                        <LinkIcon size={15} className="text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">Group invite link</span>
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            "text-muted-foreground transition-transform",
                                            inviteLinkExpanded && "rotate-180",
                                        )}
                                    />
                                </button>
                                {inviteLinkExpanded && (
                                    <div className="mt-2 space-y-2">
                                        {inviteLinkLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                                            </div>
                                        ) : inviteLink ? (
                                            <>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Input
                                                        value={inviteLink}
                                                        readOnly
                                                        className="h-8 text-xs bg-muted/40 flex-1 min-w-0"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={handleCopyInviteLink}
                                                        title="Copy"
                                                    >
                                                        <Copy size={13} />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={() => setShowQrDialog(true)}
                                                        title="QR Code"
                                                    >
                                                        <QrCode size={13} />
                                                    </Button>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                                                    onClick={handleResetInviteLink}
                                                    disabled={inviteLinkLoading}
                                                >
                                                    <RefreshCw size={11} />
                                                    Reset link
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1.5 w-full"
                                                onClick={fetchInviteLink}
                                            >
                                                <LinkIcon size={12} />
                                                Create invite link
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Separator />

                            {/* Group bulletin board */}
                            <div className="px-4 py-3">
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full mb-2"
                                    onClick={() => setBoardExpanded((v) => !v)}
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText size={15} className="text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">Group Bulletin Board</span>
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            "text-muted-foreground transition-transform",
                                            boardExpanded && "rotate-180",
                                        )}
                                    />
                                </button>
                                {boardExpanded && (
                                    <div className="flex flex-col gap-1">
                                        <button
                                            type="button"
                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 cursor-pointer transition text-left"
                                            onClick={() => setShowNotes(true)}
                                        >
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <FileText size={13} className="text-brand" />
                                            </div>
                                            <span className="text-xs text-foreground">Notes</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 cursor-pointer transition text-left"
                                            onClick={() => setShowPinnedMessages(true)}
                                        >
                                            <div className="h-7 w-7 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                                                <Pin size={13} className="text-amber-500" />
                                            </div>
                                            <span className="text-xs text-foreground">Pinned Messages</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 cursor-pointer transition text-left"
                                            onClick={() => setShowReminders(true)}
                                        >
                                            <div className="h-7 w-7 rounded bg-green-500/10 flex items-center justify-center shrink-0">
                                                <Bell size={13} className="text-green-500" />
                                            </div>
                                            <span className="text-xs text-foreground">Reminders</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Photos/Videos */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Image size={15} className="text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Media</span>
                            </div>
                            <button
                                className="text-[12px] text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
                                onClick={() => { setSharedMediaTab("media"); setSharedMediaOpen(true); }}
                            >
                                View all ({liveMediaFiles.length})
                            </button>
                        </div>
                        {liveMediaFiles.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">No media yet</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {liveMediaFiles.slice(0, 6).map((file) => (
                                    <a
                                        key={file.fileId}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="aspect-square rounded bg-muted/60 border border-border/40 overflow-hidden cursor-pointer hover:opacity-80 transition"
                                    >
                                        {file.fileType?.startsWith("video/") ? (
                                            <video src={file.url} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                                        )}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* File */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <FileText size={15} className="text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">File</span>
                            </div>
                            <button
                                className="text-[12px] text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
                                onClick={() => { setSharedMediaTab("files"); setSharedMediaOpen(true); }}
                            >
                                View all ({liveDocFiles.length})
                            </button>
                        </div>
                        {liveDocFiles.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">No files yet</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {liveDocFiles.slice(0, 5).map((file) => {
                                    const sizeStr = file.fileSize
                                        ? file.fileSize > 1048576
                                            ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                                            : `${(file.fileSize / 1024).toFixed(0)} KB`
                                        : "";
                                    const dateStr = file.createdAt
                                        ? new Date(file.createdAt).toLocaleDateString("en-US")
                                        : "";
                                    return (
                                        <a
                                            key={file.fileId}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 cursor-pointer transition"
                                        >
                                            <div className="h-8 w-8 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <FileText size={14} className="text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-foreground truncate">{file.fileName}</p>
                                                <p className="text-[11px] text-muted-foreground">{sizeStr}{sizeStr && dateStr ? " · " : ""}{dateStr}</p>
                                            </div>
                                            <Download size={14} className="text-muted-foreground shrink-0" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Link */}
                    {liveLinkMessages.length > 0 && (
                        <>
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon size={15} className="text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">Link</span>
                                </div>
                                <button
                                    className="text-[12px] text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
                                    onClick={() => { setSharedMediaTab("links"); setSharedMediaOpen(true); }}
                                >
                                    View all ({liveLinkMessages.length})
                                </button>
                                <div className="flex flex-col gap-2">
                                    {liveLinkMessages.map((link, i) => (
                                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                            className="flex min-w-0 items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition no-underline">
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <LinkIcon size={13} className="text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <p className="text-xs text-brand truncate">{link.domain}</p>
                                                <p className="text-[11px] text-muted-foreground truncate leading-tight" title={link.url}>{link.url}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Delete Conversation */}
                    <div className="px-4 py-4">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 size={16} />
                            {isDeleting ? "Deleting..." : "Delete conversation"}
                        </Button>
                        {isGroup && isOwner && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2 mt-1"
                                onClick={handleDissolve}
                                disabled={isDismissing}
                            >
                                <Trash2 size={16} />
                                {isDismissing ? "Dissolving..." : "Dissolve group"}
                            </Button>
                        )}
                        {isGroup && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2 mt-1"
                                onClick={handleLeaveGroup}
                                disabled={isLeaving}
                            >
                                <LogOut size={16} />
                                {isLeaving ? "Leaving..." : "Leave group"}
                            </Button>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Mute Duration Dialog */}
            <Dialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Silence notifications</DialogTitle>
                    </DialogHeader>
                    <RadioGroup value={muteDuration} onValueChange={setMuteDuration} className="gap-3 py-1">
                        {MUTE_OPTIONS.map((opt) => (
                            <div key={opt.value} className="flex items-center gap-3">
                                <RadioGroupItem value={opt.value} id={`mute-${opt.value}`} />
                                <Label htmlFor={`mute-${opt.value}`} className="cursor-pointer text-sm font-normal">
                                    {opt.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowMuteDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmMute}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Members Dialog (group only) */}
            {isGroup && (
                <AddMembersDialog
                    open={showAddMembersDialog}
                    onOpenChange={setShowAddMembersDialog}
                    conversationId={conversation.id}
                    existingMemberIds={conversation.participantIds}
                />
            )}

            {/* Bulletin board dialogs */}
            {isGroup && (
                <NotesDialog
                    conversationId={conversation.id}
                    open={showNotes}
                    onOpenChange={setShowNotes}
                />
            )}
            {isGroup && (
                <PinnedMessagesDialog
                    conversationId={conversation.id}
                    open={showPinnedMessages}
                    onOpenChange={setShowPinnedMessages}
                />
            )}
            {isGroup && (
                <RemindersDialog
                    conversationId={conversation.id}
                    open={showReminders}
                    onOpenChange={setShowReminders}
                />
            )}

            {/* QR Code Dialog */}
            <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogContent className="sm:max-w-xs flex flex-col items-center gap-4 py-8">
                    <DialogHeader>
                        <DialogTitle className="text-center">Group QR Code</DialogTitle>
                    </DialogHeader>
                    {inviteLink && (
                        <QRCodeSVG value={inviteLink} size={200} level="M" />
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Scan QR code to join group
                    </p>
                </DialogContent>
            </Dialog>

            {/* Shared Media Dialog */}
            <SharedMediaDialog
                conversationId={conversation.id}
                open={sharedMediaOpen}
                onOpenChange={setSharedMediaOpen}
                defaultTab={sharedMediaTab}
            />
        </aside>
    );
}
