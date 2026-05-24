import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { groupService } from "@/services/group.service";
import { conversationService } from "@/services/conversation.service";
import { fileService } from "@/services/file.service";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { AddMembersDialog } from "./AddMembersDialog";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Crown,
    Shield,
    UserMinus,
    UserPlus,
    Search,
    Settings,
    Users,
    ChevronDown,
    Check,
    X,
    Loader2,
    Save,
    Upload,
    Link as LinkIcon,
    Copy,
    RefreshCw,
    QrCode,
    UserCheck,
    UserX,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroupMemberResponse, GroupRole, PendingJoinResponse } from "@/types/group";
import { QRCodeSVG } from "qrcode.react";

interface GroupManagementPanelProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialGroupName?: string;
    initialGroupAvatar?: string;
    initialRequireApproval?: boolean;
    initialAllowMembersUpdate?: boolean;
    initialAiProactiveEnabled?: boolean;
    onGroupUpdated?: (name: string, avatarUrl?: string) => void;
    defaultTab?: "members" | "settings";
}

const ROLE_CONFIG: Record<
    GroupRole,
    { label: string; icon: React.ReactNode; className: string }
> = {
    OWNER: {
        label: "Owner",
        icon: <Crown size={11} />,
        className:
            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    ADMIN: {
        label: "Admin",
        icon: <Shield size={11} />,
        className:
            "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    MEMBER: {
        label: "Member",
        icon: null,
        className: "bg-muted text-muted-foreground border-border",
    },
};

const ROLE_ORDER: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
const ROLE_MENU_WIDTH = 160;
const ROLE_MENU_OFFSET = 6;
const ROLE_MENU_VIEWPORT_PADDING = 12;
const ROLE_MENU_HEADER_HEIGHT = 34;
const ROLE_MENU_ITEM_HEIGHT = 34;

function RoleBadge({ role }: { role: GroupRole }) {
    const cfg = ROLE_CONFIG[role];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
                cfg.className,
            )}
        >
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

export function GroupManagementPanel({
    conversationId,
    open,
    onOpenChange,
    initialGroupName = "",
    initialGroupAvatar = "",
    initialRequireApproval = false,
    initialAllowMembersUpdate = true,
    initialAiProactiveEnabled = false,
    onGroupUpdated,
    defaultTab = "members",
}: GroupManagementPanelProps) {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { notifications, removeByTypeAndReference } = useNotificationStore();

    const [members, setMembers] = useState<GroupMemberResponse[]>([]);
    const [dissolveOpen, setDissolveOpen] = useState(false);
    const [dissolving, setDissolving] = useState(false);
    const [loading, setLoading] = useState(false);

    // Member list filter
    const [memberSearch, setMemberSearch] = useState("");

    // Add members dialog
    const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);

    // Remove member confirmation
    const [removingMember, setRemovingMember] = useState<GroupMemberResponse | null>(null);

    // Group settings
    const [groupName, setGroupName] = useState(initialGroupName);
    const [groupAvatar, setGroupAvatar] = useState(initialGroupAvatar);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [allowMembersUpdate, setAllowMembersUpdate] = useState(initialAllowMembersUpdate);
    const [requireApproval, setRequireApproval] = useState(initialRequireApproval);
    const [aiProactiveEnabled, setAiProactiveEnabled] = useState(initialAiProactiveEnabled);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Invite link
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [, setInviteToken] = useState<string | null>(null);
    const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);

    // Pending requests
    const [pendingRequests, setPendingRequests] = useState<PendingJoinResponse[]>([]);
    const [, setPendingLoading] = useState(false);

    // Inline role dropdown
    const [roleMenuOpenFor, setRoleMenuOpenFor] = useState<string | null>(null);

    const myRole = members.find((m) => m.userId === currentUser?.id)?.role;
    const isOwnerOrAdmin = myRole === "OWNER" || myRole === "ADMIN";

    const sortedMembers = [...members].sort(
        (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
    );
    const filteredMembers = sortedMembers.filter((m) => {
        if (!memberSearch.trim()) return true;
        const q = memberSearch.toLowerCase();
        return (
            m.displayName.toLowerCase().includes(q) ||
            m.username.toLowerCase().includes(q)
        );
    });

    // ── Data fetching ─────────────────────────────────────────────────
    const fetchMembers = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const res = await groupService.getMembers(conversationId);
            setMembers(res.result ?? []);
        } catch {
            toast.error("Failed to load member list");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (open) {
            fetchMembers();
            setMemberSearch("");
            setGroupName(initialGroupName);
            setGroupAvatar(initialGroupAvatar);
            setRequireApproval(initialRequireApproval);
            setAllowMembersUpdate(initialAllowMembersUpdate);
            setAiProactiveEnabled(initialAiProactiveEnabled);
        }
    }, [open, fetchMembers, initialGroupName, initialGroupAvatar]);

    // Listen for ROLE_UPDATED events to refresh the member list in realtime
    useEffect(() => {
        if (!open || !conversationId) return;
        const client = socketService.getClient();
        if (!client?.connected) return;

        const sub = client.subscribe(
            `/topic/conversation.${conversationId}`,
            (frame) => {
                try {
                    const event = JSON.parse(frame.body);
                    if (event.action === "ROLE_UPDATED" || event.action === "GROUP_UPDATE") {
                        fetchMembers();
                    }
                } catch { /* ignore */ }
            },
        );

        return () => { sub.unsubscribe(); };
    }, [open, conversationId, fetchMembers]);

    // ── Actions ───────────────────────────────────────────────────────
    const handleAvatarFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        try {
            const res = await fileService.upload(file);
            setGroupAvatar(res.url);
            toast.success("Image uploaded");
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const handleRemoveMember = async (member: GroupMemberResponse) => {
        // Show confirmation dialog instead of removing directly
        setRemovingMember(member);
    };

    const confirmRemoveMember = async () => {
        if (!removingMember) return;
        try {
            await groupService.removeMember(conversationId, removingMember.userId);
            toast.success(`Removed ${removingMember.displayName} from group`);
            fetchMembers();
        } catch {
            toast.error("Failed to remove member");
        } finally {
            setRemovingMember(null);
        }
    };

    const handleUpdateRole = async (userId: string, role: GroupRole) => {
        try {
            await groupService.updateRole(conversationId, userId, { role });
            toast.success("Role updated");
            setRoleMenuOpenFor(null);
            fetchMembers();
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleSaveSettings = async () => {
        if (!groupName.trim()) {
            toast.error("Group name cannot be empty");
            return;
        }
        setSettingsSaving(true);
        try {
            await groupService.updateGroup(conversationId, {
                name: groupName.trim(),
                avatar: groupAvatar.trim() || undefined,
                allowMembersUpdateInfo: allowMembersUpdate,
                requireApproval,
                aiProactiveEnabled,
            });
            toast.success("Group info saved");
            onGroupUpdated?.(groupName.trim(), groupAvatar.trim() || undefined);
        } catch {
            toast.error("Failed to update group");
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleDissolveGroup = async () => {
        setDissolving(true);
        try {
            await conversationService.delete(conversationId);
            setDissolveOpen(false);
            onOpenChange(false);
            toast.success("Group has been dissolved");
            navigate("/chat");
        } catch {
            toast.error("Could not dissolve group");
        } finally {
            setDissolving(false);
        }
    };

    const canManageMember = (target: GroupMemberResponse): boolean => {
        if (!isOwnerOrAdmin) return false;
        if (target.userId === currentUser?.id) return false;
        if (myRole === "ADMIN" && (target.role === "OWNER" || target.role === "ADMIN"))
            return false;
        return true;
    };

    // ── Invite Link ─────────────────────────────────────────────────
    const fetchInviteLink = async () => {
        setInviteLinkLoading(true);
        try {
            const res = await groupService.getOrCreateInviteLink(conversationId);
            const data = res.result;
            if (data) {
                setInviteToken(data.inviteToken);
                setInviteLink(`${import.meta.env.VITE_WEB_BASE_URL || window.location.origin}/join/${data.inviteToken}`);
            }
        } catch {
            toast.error("Failed to create invite link");
        } finally {
            setInviteLinkLoading(false);
        }
    };

    const handleResetInviteLink = async () => {
        setInviteLinkLoading(true);
        try {
            const res = await groupService.resetInviteLink(conversationId);
            const data = res.result;
            if (data) {
                setInviteToken(data.inviteToken);
                setInviteLink(`${import.meta.env.VITE_WEB_BASE_URL || window.location.origin}/join/${data.inviteToken}`);
            }
            toast.success("Invite link reset");
        } catch {
            toast.error("Failed to reset invite link");
        } finally {
            setInviteLinkLoading(false);
        }
    };

    const handleCopyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast.success("Invite link copied");
        }
    };

    // ── Pending Requests ────────────────────────────────────────────
    const fetchPendingRequests = async () => {
        if (!isOwnerOrAdmin) return;
        setPendingLoading(true);
        try {
            const res = await groupService.getPendingRequests(conversationId);
            setPendingRequests(res.result ?? []);
        } catch {
            // silent
        } finally {
            setPendingLoading(false);
        }
    };

    const handleApprovePending = async (userId: string) => {
        try {
            await groupService.approvePendingRequest(conversationId, userId);
            toast.success("Request approved");
            removeByTypeAndReference("GROUP_JOIN_REQUEST", conversationId);
            fetchPendingRequests();
            fetchMembers();
        } catch {
            toast.error("Failed to approve request");
        }
    };

    const handleRejectPending = async (userId: string) => {
        try {
            await groupService.rejectPendingRequest(conversationId, userId);
            toast.success("Request rejected");
            removeByTypeAndReference("GROUP_JOIN_REQUEST", conversationId);
            fetchPendingRequests();
        } catch {
            toast.error("Failed to reject request");
        }
    };

    // Re-fetch pending requests when a GROUP_JOIN_REQUEST notification arrives for this conversation
    const joinRequestCount = notifications.filter(
        (n) => n.type === "GROUP_JOIN_REQUEST" && n.referenceId === conversationId,
    ).length;

    useEffect(() => {
        if (open && isOwnerOrAdmin) {
            fetchPendingRequests();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinRequestCount]);

    // Fetch invite link + pending on settings tab open
    useEffect(() => {
        if (open && isOwnerOrAdmin) {
            fetchInviteLink();
            fetchPendingRequests();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isOwnerOrAdmin]);

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-x-hidden overflow-y-auto max-h-[85vh] flex flex-col">
                {/* Header */}
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <Users size={15} />
                        </div>
                        Group Management
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {loading ? "Loading..." : `${members.length} members`}
                    </p>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="flex flex-1 min-h-0 flex-col">
                    <div className="px-5 shrink-0">
                        <TabsList className="h-9 w-full bg-muted/50">
                            <TabsTrigger value="members" className="flex-1 gap-1.5 text-xs">
                                <Users size={13} />
                                Members
                            </TabsTrigger>
                            {isOwnerOrAdmin && (
                                <TabsTrigger value="settings" className="flex-1 gap-1.5 text-xs relative">
                                    <Settings size={13} />
                                    Group Settings
                                    {pendingRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                            {pendingRequests.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* ── Members Tab ─────────────────────── */}
                    <TabsContent
                        value="members"
                        className="mt-0 flex flex-1 min-h-0 flex-col px-5 pb-5"
                    >
                        {/* Search bar + Add button */}
                        <div className="flex items-center gap-2 pt-3 pb-2 shrink-0">
                            <div className="relative flex-1">
                                <Search
                                    size={13}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                />
                                <Input
                                    placeholder="Search members..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="h-8 pl-8 text-sm bg-muted/40 border-transparent focus-visible:border-brand/50 focus-visible:ring-1 focus-visible:ring-brand/30"
                                />
                            </div>
                            {isOwnerOrAdmin && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 shrink-0 gap-1.5 border-brand/30 text-brand text-xs hover:bg-brand/10 hover:text-brand"
                                    onClick={() => setShowAddMembersDialog(true)}
                                >
                                    <UserPlus size={13} />
                                    Add
                                </Button>
                            )}
                        </div>

                        {/* Member list */}
                        <ScrollArea type="always" className="-mx-1 flex-1 min-h-0 px-1 pr-2">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredMembers.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                                    <Users size={24} className="opacity-30" />
                                    <p className="text-xs">No members found</p>
                                </div>
                            ) : (
                                <div className="space-y-px">
                                    {filteredMembers.map((member) => (
                                        <MemberRow
                                            key={member.userId}
                                            member={member}
                                            isCurrentUser={member.userId === currentUser?.id}
                                            canManage={canManageMember(member)}
                                            myRole={myRole}
                                            roleMenuOpenFor={roleMenuOpenFor}
                                            onRoleMenuOpenChange={(nextOpen) =>
                                                setRoleMenuOpenFor(
                                                    nextOpen ? member.userId : null,
                                                )
                                            }
                                            onUpdateRole={handleUpdateRole}
                                            onRemove={() => handleRemoveMember(member)}
                                        />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* ── Settings Tab ────────────────────── */}
                    {isOwnerOrAdmin && (
                        <TabsContent
                            value="settings"
                            className="mt-0 flex flex-1 min-h-0 flex-col px-5 pb-5"
                        >
                            <ScrollArea type="always" className="flex-1 min-h-0 -mx-1 px-1 pr-2">
                            <div className="space-y-4 pt-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Group Name
                                    </label>
                                    <Input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Enter group name..."
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Group Avatar
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-14 w-14 shrink-0">
                                            <AvatarImage src={groupAvatar} />
                                            <AvatarFallback className="text-xl font-semibold">
                                                {groupName.charAt(0).toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarFileChange}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => avatarInputRef.current?.click()}
                                                disabled={avatarUploading}
                                                className="h-8 text-xs gap-1.5"
                                            >
                                                {avatarUploading ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Upload size={12} />
                                                )}
                                                {avatarUploading ? "Loading..." : "Select image"}
                                            </Button>
                                            {groupAvatar && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setGroupAvatar("")}
                                                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                                                >
                                                    <X size={12} />
                                                    Remove image
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Invite link section ── */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                        <LinkIcon size={12} /> Group Invite Link
                                    </label>
                                    {inviteLink ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
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
                                                    title="Copy link"
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
                                            {isOwnerOrAdmin && (
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
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs gap-1.5"
                                            onClick={fetchInviteLink}
                                            disabled={inviteLinkLoading}
                                        >
                                            {inviteLinkLoading ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <LinkIcon size={12} />
                                            )}
                                            Create invite link
                                        </Button>
                                    )}
                                </div>

                                <Separator />

                                {/* ── Toggle switches ── */}
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            Allow members to update info
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            If enabled, all members can change group name and avatar
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAllowMembersUpdate(!allowMembersUpdate)}
                                        className={cn(
                                            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                                            allowMembersUpdate ? "bg-brand" : "bg-muted/40"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                                                allowMembersUpdate ? "translate-x-5" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            Approve new members
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Require owner approval before adding new members
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRequireApproval(!requireApproval)}
                                        className={cn(
                                            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                                            requireApproval ? "bg-brand" : "bg-muted/40"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                                                requireApproval ? "translate-x-5" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            AI proactive assistant
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Let AI suggest answers to unanswered questions in this group
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAiProactiveEnabled(!aiProactiveEnabled)}
                                        disabled={!isOwnerOrAdmin}
                                        className={cn(
                                            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                                            aiProactiveEnabled ? "bg-violet-500" : "bg-muted/40",
                                            !isOwnerOrAdmin && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                                                aiProactiveEnabled ? "translate-x-5" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* ── Pending join requests ── */}
                                {isOwnerOrAdmin && pendingRequests.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                                <UserCheck size={12} /> Pending requests ({pendingRequests.length})
                                            </label>
                                            <div className="space-y-1">
                                                {pendingRequests.map((req) => (
                                                    <div
                                                        key={req.id}
                                                        className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                                                    >
                                                        <Avatar className="h-8 w-8 shrink-0">
                                                            <AvatarImage src={req.avatarUrl ?? undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {req.displayName.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                <p className="truncate text-sm font-medium">{req.displayName}</p>
                                                                {req.userRole === "ADMIN" && (
                                                                    <AdminBadge className="size-3.5" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">@{req.username}</p>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleApprovePending(req.userId)}
                                                                title="Approve"
                                                            >
                                                                <UserCheck size={14} />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                                onClick={() => handleRejectPending(req.userId)}
                                                                title="Reject"
                                                            >
                                                                <UserX size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={settingsSaving}
                                    size="sm"
                                    className="w-full gap-2"
                                >
                                    {settingsSaving ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Save size={13} />
                                    )}
                                    Save changes
                                </Button>

                                {myRole === "OWNER" && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wide text-destructive flex items-center gap-1.5">
                                                <AlertTriangle size={12} /> Danger Zone
                                            </label>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full gap-2"
                                                onClick={() => setDissolveOpen(true)}
                                            >
                                                <AlertTriangle size={13} />
                                                Dissolve Group
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                            </ScrollArea>
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>

        {/* Remove Member Confirmation */}
        <Dialog open={!!removingMember} onOpenChange={(o) => !o && setRemovingMember(null)}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Remove Member</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{removingMember?.displayName}</strong> from the group?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" size="sm" onClick={() => setRemovingMember(null)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={confirmRemoveMember}>
                        Remove
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dissolve Group Confirmation */}
        <Dialog open={dissolveOpen} onOpenChange={(o) => !dissolving && setDissolveOpen(o)}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle size={16} />
                        Dissolve Group
                    </DialogTitle>
                    <DialogDescription>
                        This will permanently delete the group, all messages, and remove all members. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" size="sm" onClick={() => setDissolveOpen(false)} disabled={dissolving}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDissolveGroup} disabled={dissolving}>
                        {dissolving ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                        Dissolve
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-center">Group Invite QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    {inviteLink && (
                        <div className="rounded-xl bg-white p-4">
                            <QRCodeSVG value={inviteLink} size={200} />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Scan QR code to join group
                    </p>
                </div>
            </DialogContent>
        </Dialog>

        {/* Add Members Dialog */}
        <AddMembersDialog
            open={showAddMembersDialog}
            onOpenChange={setShowAddMembersDialog}
            conversationId={conversationId}
            existingMemberIds={members.map((m) => m.userId)}
            onAdded={fetchMembers}
        />
        </>
    );
}

// ── Member row sub-component ──────────────────────────────────────────────
interface MemberRowProps {
    member: GroupMemberResponse;
    isCurrentUser: boolean;
    canManage: boolean;
    myRole: GroupRole | undefined;
    roleMenuOpenFor: string | null;
    onRoleMenuOpenChange: (open: boolean) => void;
    onUpdateRole: (userId: string, role: GroupRole) => void;
    onRemove: () => void;
}

function MemberRow({
    member,
    isCurrentUser,
    canManage,
    myRole,
    roleMenuOpenFor,
    onRoleMenuOpenChange,
    onUpdateRole,
    onRemove,
}: MemberRowProps) {
    const isRoleMenuOpen = roleMenuOpenFor === member.userId;
    const availableRoles: GroupRole[] =
        myRole === "OWNER" ? ["OWNER", "ADMIN", "MEMBER"] : ["ADMIN", "MEMBER"];
    const roleButtonRef = useRef<HTMLButtonElement>(null);
    const roleMenuRef = useRef<HTMLDivElement>(null);
    const [roleMenuPosition, setRoleMenuPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);

    const updateRoleMenuPosition = useCallback((triggerOverride?: HTMLButtonElement | null) => {
        const trigger = triggerOverride ?? roleButtonRef.current;
        if (!trigger) {
            return;
        }

        const triggerRect = trigger.getBoundingClientRect();
        const estimatedMenuHeight =
            ROLE_MENU_HEADER_HEIGHT + availableRoles.length * ROLE_MENU_ITEM_HEIGHT;
        const availableBelow =
            window.innerHeight - triggerRect.bottom - ROLE_MENU_VIEWPORT_PADDING;
        const preferredTop =
            availableBelow >= estimatedMenuHeight
                ? triggerRect.bottom + ROLE_MENU_OFFSET
                : triggerRect.top - estimatedMenuHeight - ROLE_MENU_OFFSET;

        setRoleMenuPosition({
            left: Math.min(
                Math.max(
                    triggerRect.right - ROLE_MENU_WIDTH,
                    ROLE_MENU_VIEWPORT_PADDING,
                ),
                window.innerWidth - ROLE_MENU_WIDTH - ROLE_MENU_VIEWPORT_PADDING,
            ),
            top: Math.max(ROLE_MENU_VIEWPORT_PADDING, preferredTop),
        });
    }, [availableRoles.length]);

    useLayoutEffect(() => {
        if (!isRoleMenuOpen) {
            setRoleMenuPosition(null);
            return;
        }

        updateRoleMenuPosition();
    }, [isRoleMenuOpen, updateRoleMenuPosition]);

    useEffect(() => {
        if (!isRoleMenuOpen) {
            return;
        }
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }
            if (
                roleMenuRef.current?.contains(target) ||
                roleButtonRef.current?.contains(target)
            ) {
                return;
            }
            onRoleMenuOpenChange(false);
        };

        const handleViewportChange = () => updateRoleMenuPosition();

        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);
        document.addEventListener("mousedown", handlePointerDown);

        return () => {
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [isRoleMenuOpen, onRoleMenuOpenChange, updateRoleMenuPosition]);

    return (
        <div className="group relative flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40">
            {/* Avatar */}
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                <AvatarImage src={member.avatar ?? undefined} />
                <AvatarFallback className="text-xs font-medium">
                    {member.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium leading-tight text-foreground">
                        {member.displayName}
                    </span>
                    {member.userRole === "ADMIN" && (
                        <AdminBadge className="size-3.5" />
                    )}
                    {isCurrentUser && (
                        <span className="text-[10px] text-muted-foreground">(You)</span>
                    )}
                    <RoleBadge role={member.role} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">@{member.username}</p>
            </div>

            {/* Action buttons (appear on row hover) */}
            {canManage && (
                <div
                    className={cn(
                        "flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                        isRoleMenuOpen && "opacity-100",
                    )}
                >
                    {/* Role change */}
                    <Button
                        ref={roleButtonRef}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Change role"
                        onClick={(event) => {
                            if (!isRoleMenuOpen) {
                                updateRoleMenuPosition(event.currentTarget);
                            }
                            onRoleMenuOpenChange(!isRoleMenuOpen);
                        }}
                    >
                        <ChevronDown size={13} />
                    </Button>

                    {isRoleMenuOpen &&
                        roleMenuPosition &&
                        createPortal(
                            <div
                                ref={roleMenuRef}
                                className="fixed z-[100] w-40 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
                                style={{
                                    left: roleMenuPosition.left,
                                    top: roleMenuPosition.top,
                                }}
                            >
                                <div className="px-2 py-1.5">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Update role
                                    </p>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {availableRoles.map((role) => (
                                        <button
                                            type="button"
                                            key={role}
                                            onClick={() => {
                                                onRoleMenuOpenChange(false);
                                                onUpdateRole(member.userId, role);
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/50",
                                                member.role === role &&
                                                    "bg-brand/10 text-brand",
                                            )}
                                        >
                                            {ROLE_CONFIG[role].icon}
                                            {ROLE_CONFIG[role].label}
                                            {member.role === role && (
                                                <Check size={10} className="ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>,
                            document.body,
                        )}

                    {/* Remove member */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Remove from group"
                        onClick={onRemove}
                    >
                        <UserMinus size={13} />
                    </Button>
                </div>
            )}
        </div>
    );
}
