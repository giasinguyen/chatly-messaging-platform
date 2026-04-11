import { useState, useEffect, useCallback, useRef } from "react";
import { groupService } from "@/services/group.service";
import { fileService } from "@/services/file.service";
import { useAuthStore } from "@/store/auth.store";
import { AddMembersDialog } from "./AddMembersDialog";
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
    onGroupUpdated?: (name: string, avatarUrl?: string) => void;
    defaultTab?: "members" | "settings";
}

const ROLE_CONFIG: Record<
    GroupRole,
    { label: string; icon: React.ReactNode; className: string }
> = {
    OWNER: {
        label: "Trưởng nhóm",
        icon: <Crown size={11} />,
        className:
            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    ADMIN: {
        label: "Quản trị viên",
        icon: <Shield size={11} />,
        className:
            "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    MEMBER: {
        label: "Thành viên",
        icon: null,
        className: "bg-muted text-muted-foreground border-border",
    },
};

const ROLE_ORDER: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

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
    onGroupUpdated,
    defaultTab = "members",
}: GroupManagementPanelProps) {
    const { user: currentUser } = useAuthStore();

    const [members, setMembers] = useState<GroupMemberResponse[]>([]);
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
    const [allowMembersUpdate, setAllowMembersUpdate] = useState(true);
    const [requireApproval, setRequireApproval] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Invite link
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);

    // Pending requests
    const [pendingRequests, setPendingRequests] = useState<PendingJoinResponse[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);

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
            toast.error("Không thể tải danh sách thành viên");
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
        }
    }, [open, fetchMembers, initialGroupName, initialGroupAvatar]);

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
            toast.success("Đã tải ảnh lên");
        } catch {
            toast.error("Không thể tải ảnh lên");
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
            toast.success(`Đã xóa ${removingMember.displayName} khỏi nhóm`);
            fetchMembers();
        } catch {
            toast.error("Không thể xóa thành viên");
        } finally {
            setRemovingMember(null);
        }
    };

    const handleUpdateRole = async (userId: string, role: GroupRole) => {
        try {
            await groupService.updateRole(conversationId, userId, { role });
            toast.success("Đã cập nhật vai trò");
            setRoleMenuOpenFor(null);
            fetchMembers();
        } catch {
            toast.error("Không thể cập nhật vai trò");
        }
    };

    const handleSaveSettings = async () => {
        if (!groupName.trim()) {
            toast.error("Tên nhóm không được để trống");
            return;
        }
        setSettingsSaving(true);
        try {
            await groupService.updateGroup(conversationId, {
                name: groupName.trim(),
                avatar: groupAvatar.trim() || undefined,
                allowMembersUpdateInfo: allowMembersUpdate,
                requireApproval,
            });
            toast.success("Đã lưu thông tin nhóm");
            onGroupUpdated?.(groupName.trim(), groupAvatar.trim() || undefined);
        } catch {
            toast.error("Không thể cập nhật nhóm");
        } finally {
            setSettingsSaving(false);
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
                setInviteLink(`${window.location.origin}/join/${data.inviteToken}`);
            }
        } catch {
            toast.error("Không thể tạo link mời");
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
                setInviteLink(`${window.location.origin}/join/${data.inviteToken}`);
            }
            toast.success("Đã tạo mới link mời");
        } catch {
            toast.error("Không thể tạo mới link mời");
        } finally {
            setInviteLinkLoading(false);
        }
    };

    const handleCopyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast.success("Đã sao chép link mời");
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
            toast.success("Đã duyệt yêu cầu");
            fetchPendingRequests();
            fetchMembers();
        } catch {
            toast.error("Không thể duyệt yêu cầu");
        }
    };

    const handleRejectPending = async (userId: string) => {
        try {
            await groupService.rejectPendingRequest(conversationId, userId);
            toast.success("Đã từ chối yêu cầu");
            fetchPendingRequests();
        } catch {
            toast.error("Không thể từ chối yêu cầu");
        }
    };

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
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <Users size={15} />
                        </div>
                        Quản lý nhóm
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {loading ? "Đang tải..." : `${members.length} thành viên`}
                    </p>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="flex flex-1 min-h-0 flex-col">
                    <div className="px-5 shrink-0">
                        <TabsList className="h-9 w-full bg-muted/50">
                            <TabsTrigger value="members" className="flex-1 gap-1.5 text-xs">
                                <Users size={13} />
                                Thành viên
                            </TabsTrigger>
                            {isOwnerOrAdmin && (
                                <TabsTrigger value="settings" className="flex-1 gap-1.5 text-xs">
                                    <Settings size={13} />
                                    Cài đặt nhóm
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
                                    placeholder="Tìm thành viên..."
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
                                    Thêm
                                </Button>
                            )}
                        </div>

                        {/* Member list */}
                        <ScrollArea className="-mx-1 flex-1 min-h-0 px-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredMembers.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                                    <Users size={24} className="opacity-30" />
                                    <p className="text-xs">Không có thành viên nào</p>
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
                                            onOpenRoleMenu={() =>
                                                setRoleMenuOpenFor((prev) =>
                                                    prev === member.userId
                                                        ? null
                                                        : member.userId,
                                                )
                                            }
                                            onCloseRoleMenu={() => setRoleMenuOpenFor(null)}
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
                            <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
                            <div className="space-y-4 pt-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Tên nhóm
                                    </label>
                                    <Input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Nhập tên nhóm..."
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Ảnh đại diện nhóm
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
                                                {avatarUploading ? "Đang tải..." : "Chọn ảnh"}
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
                                                    Xóa ảnh
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Invite link section ── */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                        <LinkIcon size={12} /> Link mời vào nhóm
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
                                                    title="Sao chép link"
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
                                            {isOwnerOrAdmin && (
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
                                            Tạo link mời
                                        </Button>
                                    )}
                                </div>

                                <Separator />

                                {/* ── Toggle switches ── */}
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            Cho phép thành viên cập nhật
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Nếu bật, tất cả thành viên có thể thay đổi tên và ảnh nhóm
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
                                            Duyệt thành viên mới
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Yêu cầu trưởng nhóm duyệt trước khi thêm thành viên mới
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

                                {/* ── Pending join requests ── */}
                                {myRole === "OWNER" && pendingRequests.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                                <UserCheck size={12} /> Yêu cầu chờ duyệt ({pendingRequests.length})
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
                                                            <p className="text-sm font-medium truncate">{req.displayName}</p>
                                                            <p className="text-xs text-muted-foreground">@{req.username}</p>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleApprovePending(req.userId)}
                                                                title="Duyệt"
                                                            >
                                                                <UserCheck size={14} />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                                onClick={() => handleRejectPending(req.userId)}
                                                                title="Từ chối"
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
                                    Lưu thay đổi
                                </Button>
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
                    <DialogTitle>Xóa thành viên</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc muốn xóa <strong>{removingMember?.displayName}</strong> khỏi nhóm?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" size="sm" onClick={() => setRemovingMember(null)}>
                        Hủy
                    </Button>
                    <Button variant="destructive" size="sm" onClick={confirmRemoveMember}>
                        Xóa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-center">Mã QR mời vào nhóm</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    {inviteLink && (
                        <div className="rounded-xl bg-white p-4">
                            <QRCodeSVG value={inviteLink} size={200} />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Quét mã QR để tham gia nhóm
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
    onOpenRoleMenu: () => void;
    onCloseRoleMenu: () => void;
    onUpdateRole: (userId: string, role: GroupRole) => void;
    onRemove: () => void;
}

function MemberRow({
    member,
    isCurrentUser,
    canManage,
    myRole,
    roleMenuOpenFor,
    onOpenRoleMenu,
    onCloseRoleMenu,
    onUpdateRole,
    onRemove,
}: MemberRowProps) {
    const isRoleMenuOpen = roleMenuOpenFor === member.userId;
    const availableRoles: GroupRole[] =
        myRole === "OWNER" ? ["OWNER", "ADMIN", "MEMBER"] : ["ADMIN", "MEMBER"];

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
                    {isCurrentUser && (
                        <span className="text-[10px] text-muted-foreground">(Bạn)</span>
                    )}
                    <RoleBadge role={member.role} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">@{member.username}</p>
            </div>

            {/* Action buttons (appear on row hover) */}
            {canManage && (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {/* Role change */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Thay đổi vai trò"
                            onClick={onOpenRoleMenu}
                        >
                            <ChevronDown size={13} />
                        </Button>

                        {isRoleMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={onCloseRoleMenu}
                                />
                                <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                                    <div className="px-2 py-1.5">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Đổi vai trò
                                        </p>
                                    </div>
                                    <div className="divide-y divide-border/50">
                                        {availableRoles.map((role) => (
                                            <button
                                                type="button"
                                                key={role}
                                                onClick={() =>
                                                    onUpdateRole(member.userId, role)
                                                }
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
                                </div>
                            </>
                        )}
                    </div>

                    {/* Remove member */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Xóa khỏi nhóm"
                        onClick={onRemove}
                    >
                        <UserMinus size={13} />
                    </Button>
                </div>
            )}
        </div>
    );
}
