import { useState, useRef, useEffect, useCallback } from "react";
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
    ChevronRight,
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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AddMembersDialog } from "./AddMembersDialog";
import { RemindersDialog } from "./RemindersDialog";
import { NotesDialog } from "./NotesDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { ChatUser } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";
import { conversationService } from "@/services/conversation.service";
import { groupService } from "@/services/group.service";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { messageService } from "@/services/message.service";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";

interface ConversationInfoPanelProps {
    conversation: ConversationResponse;
    participant: ChatUser;
    currentUserId: string;
    onDeleteConversation: () => void;
    onOpenGroupPanel?: () => void;
    onOpenGroupSettingsPanel?: () => void;
    onCreateGroup?: () => void;
    onNicknameChange?: (nickname: string) => void;
    onGroupUpdated?: (name: string, avatarUrl?: string) => void;
    onConversationUpdate?: (updated: ConversationResponse) => void;
}

const MUTE_OPTIONS = [
    { value: "1h", label: "1 giờ", duration: 1 * 60 * 60 * 1000 },
    { value: "4h", label: "4 giờ", duration: 4 * 60 * 60 * 1000 },
    { value: "8h", label: "8 giờ", duration: 8 * 60 * 60 * 1000 },
    { value: "forever", label: "Cho đến khi tôi bật lại", duration: null },
] as const;

export function ConversationInfoPanel({
    conversation,
    participant,
    currentUserId: _currentUserId,
    onDeleteConversation,
    onOpenGroupPanel,
    onCreateGroup,
    onNicknameChange,
    onGroupUpdated,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Mute duration dialog
    const [showMuteDialog, setShowMuteDialog] = useState(false);
    const [muteDuration, setMuteDuration] = useState<string>("1h");

    // Nickname editing
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nicknameDraft, setNicknameDraft] = useState(storedNickname || participant.displayName);

    // Add members dialog (group only)
    const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);

    // Media & files from S3
    const [mediaFiles, setMediaFiles] = useState<FileUploadResponse[]>([]);
    const [docFiles, setDocFiles] = useState<FileUploadResponse[]>([]);
    const [linkMessages, setLinkMessages] = useState<{ url: string; domain: string }[]>([]);

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
                    setMediaFiles(images);
                    setDocFiles(docs);
                    const extracted: { url: string; domain: string }[] = [];
                    for (const msg of linkMsgs.result) {
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
    }, [conversation.id]);

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
    const [showReminders, setShowReminders] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    // Invite link
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [inviteLinkExpanded, setInviteLinkExpanded] = useState(false);

    // Invite link handlers
    const fetchInviteLink = useCallback(async () => {
        if (!isGroup) return;
        setInviteLinkLoading(true);
        try {
            const res = await groupService.getOrCreateInviteLink(conversation.id);
            if (res.result) {
                setInviteLink(`${window.location.origin}/join/${res.result.inviteToken}`);
            }
        } catch { /* silent */ } finally { setInviteLinkLoading(false); }
    }, [isGroup, conversation.id]);

    const handleResetInviteLink = async () => {
        setInviteLinkLoading(true);
        try {
            const res = await groupService.resetInviteLink(conversation.id);
            if (res.result) {
                setInviteLink(`${window.location.origin}/join/${res.result.inviteToken}`);
            }
            toast.success("Đã tạo mới link mời");
        } catch { toast.error("Không thể tạo mới link mời"); }
        finally { setInviteLinkLoading(false); }
    };

    const handleCopyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast.success("Đã sao chép link mời");
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
            toast.success("Đã bật thông báo");
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
        toast.success(`Đã tắt thông báo · ${option?.label ?? ""}`);
    };

    const handleTogglePin = () => {
        const pinnedConvs = Object.entries(useConversationPrefsStore.getState().prefs)
            .filter(([, p]) => p.isPinned);
        if (!isPinned && pinnedConvs.length >= 5) {
            toast.warning("Chỉ có thể ghim tối đa 5 hội thoại");
            return;
        }
        setPin(conversation.id, !isPinned);
        toast.success(isPinned ? "Đã bỏ ghim hội thoại" : "Đã ghim hội thoại");
    };

    const handleSaveNickname = () => {
        const trimmed = nicknameDraft.trim();
        if (!trimmed) return;
        storeSetNickname(conversation.id, trimmed);
        onNicknameChange?.(trimmed);
        setIsEditingNickname(false);
        toast.success("Đã đặt biệt danh");
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
            _onConversationUpdate?.(updated.result as any);
            setIsEditingGroupName(false);
            toast.success("Đã đổi tên nhóm");
        } catch {
            toast.error("Không thể đổi tên nhóm");
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
            _onConversationUpdate?.(updated.result as any);
            toast.success("Đã cập nhật ảnh nhóm");
        } catch {
            toast.error("Không thể cập nhật ảnh nhóm");
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá cuộc trò chuyện này?")) return;
        try {
            setIsDeleting(true);
            await conversationService.delete(conversation.id);
            onDeleteConversation();
            navigate("/chat");
            toast.success("Đã xoá cuộc trò chuyện");
        } catch {
            toast.error("Không thể xoá cuộc trò chuyện. Vui lòng thử lại.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <aside className="hidden lg:flex flex-col w-[300px] xl:w-[320px] shrink-0 border-l border-border bg-background dark:bg-[#22252b] overflow-hidden">
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold text-foreground">
                    {isGroup ? "Thông tin nhóm" : "Thông tin hội thoại"}
                </h3>
            </div>

            <ScrollArea className="flex-1 [&>[data-slot=scroll-area-viewport]]:overflow-x-hidden">
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
                                <span className="text-[15px] font-semibold text-foreground text-center leading-tight">
                                    {storedNickname || participant.displayName}
                                </span>
                                {!isGroup ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNicknameDraft(storedNickname || participant.displayName);
                                            setIsEditingNickname(true);
                                        }}
                                        className="shrink-0 text-muted-foreground hover:text-foreground transition"
                                        title="Đặt biệt danh"
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
                                        title="Đổi tên nhóm"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-start justify-center gap-4 px-4 pb-4">
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
                                {isMuted ? "Bật thông\nbáo" : "Tắt thông\nbáo"}
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
                                {isPinned ? "Bỏ ghim" : "Ghim hội\nthoại"}
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
                                    Thêm{"\n"}thành viên
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
                                    Tạo nhóm trò chuyện
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
                                    Quản lý nhóm
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
                                <span className="text-sm font-medium text-foreground">Thành viên nhóm</span>
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
                                        <span className="text-muted-foreground">{conversation.participantIds.length} thành viên</span>
                                    </button>
                                    </div>
                                </div>
                            )}
                            <Separator />

                            {/* Link mời vào nhóm */}
                            <div className="px-4 py-3">
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full"
                                    onClick={() => setInviteLinkExpanded((v) => !v)}
                                >
                                    <div className="flex items-center gap-2">
                                        <LinkIcon size={15} className="text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">Link mời vào nhóm</span>
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
                                                <div className="flex items-center gap-1.5">
                                                    <Input
                                                        value={inviteLink}
                                                        readOnly
                                                        className="h-8 text-xs bg-muted/40 flex-1"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={handleCopyInviteLink}
                                                        title="Sao chép"
                                                    >
                                                        <Copy size={13} />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={() => setShowQrDialog(true)}
                                                        title="Mã QR"
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
                                                    Tạo mới link
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
                                                Tạo link mời
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Separator />

                            {/* Bảng tin nhóm */}
                            <div className="px-4 py-3">
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full mb-2"
                                    onClick={() => setBoardExpanded((v) => !v)}
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText size={15} className="text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">Bảng tin nhóm</span>
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
                                            onClick={() => setShowReminders(true)}
                                        >
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <Image size={13} className="text-brand" />
                                            </div>
                                            <span className="text-xs text-foreground">Danh sách nhắc hẹn</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 cursor-pointer transition text-left"
                                            onClick={() => setShowNotes(true)}
                                        >
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <FileText size={13} className="text-brand" />
                                            </div>
                                            <span className="text-xs text-foreground">Ghi chú, ghim, bình chọn</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Ảnh/Video */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Image size={15} className="text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Ảnh/Video</span>
                            </div>
                            {mediaFiles.length > 6 && (
                                <button
                                    type="button"
                                    className="flex items-center gap-0.5 text-[12px] text-brand hover:underline"
                                    onClick={() => toast.info("Hiện đang hiển thị 6 mục gần nhất")}
                                >
                                    Xem tất cả <ChevronRight size={12} />
                                </button>
                            )}
                        </div>
                        {mediaFiles.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">Chưa có ảnh/video nào</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {mediaFiles.slice(0, 6).map((file) => (
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
                        </div>
                        {docFiles.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">Chưa có file nào</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {docFiles.slice(0, 5).map((file) => {
                                    const sizeStr = file.fileSize
                                        ? file.fileSize > 1048576
                                            ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                                            : `${(file.fileSize / 1024).toFixed(0)} KB`
                                        : "";
                                    const dateStr = file.createdAt
                                        ? new Date(file.createdAt).toLocaleDateString("vi-VN")
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
                    {linkMessages.length > 0 && (
                        <>
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon size={15} className="text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">Link</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {linkMessages.map((link, i) => (
                                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                            className="flex min-w-0 items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition no-underline">
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <LinkIcon size={13} className="text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <p className="text-xs text-brand truncate">{link.domain}</p>
                                                <p className="text-[11px] text-muted-foreground break-all leading-tight">{link.url}</p>
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
                            {isDeleting ? "Đang xoá..." : "Xoá trò chuyện"}
                        </Button>
                    </div>
                </div>
            </ScrollArea>

            {/* Mute Duration Dialog */}
            <Dialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Tắt thông báo</DialogTitle>
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
                        <Button variant="ghost" onClick={() => setShowMuteDialog(false)}>Huỷ</Button>
                        <Button onClick={handleConfirmMute}>Xác nhận</Button>
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
                <>
                    <RemindersDialog
                        conversationId={conversation.id}
                        open={showReminders}
                        onOpenChange={setShowReminders}
                    />
                    <NotesDialog
                        conversationId={conversation.id}
                        open={showNotes}
                        onOpenChange={setShowNotes}
                    />
                </>
            )}

            {/* QR Code Dialog */}
            <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogContent className="sm:max-w-xs flex flex-col items-center gap-4 py-8">
                    <DialogHeader>
                        <DialogTitle className="text-center">Mã QR mời vào nhóm</DialogTitle>
                    </DialogHeader>
                    {inviteLink && (
                        <QRCodeSVG value={inviteLink} size={200} level="M" />
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Quét mã QR để tham gia nhóm
                    </p>
                </DialogContent>
            </Dialog>
        </aside>
    );
}
