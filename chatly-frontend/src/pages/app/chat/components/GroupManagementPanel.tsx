import { useState, useEffect, useCallback, useRef } from "react";
import { groupService } from "@/services/group.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroupMemberResponse, GroupRole } from "@/types/group";
import type { UserResponse } from "@/types/auth";

interface GroupManagementPanelProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialGroupName?: string;
    initialGroupAvatar?: string;
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
}: GroupManagementPanelProps) {
    const { user: currentUser } = useAuthStore();

    const [members, setMembers] = useState<GroupMemberResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // Member list filter
    const [memberSearch, setMemberSearch] = useState("");

    // Add member search
    const [addSearchQuery, setAddSearchQuery] = useState("");
    const [addSearchResults, setAddSearchResults] = useState<UserResponse[]>([]);
    const [addSearchLoading, setAddSearchLoading] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<UserResponse | null>(null);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const addSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Group settings
    const [groupName, setGroupName] = useState(initialGroupName);
    const [groupAvatar, setGroupAvatar] = useState(initialGroupAvatar);
    const [settingsSaving, setSettingsSaving] = useState(false);

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
            setAddSearchQuery("");
            setAddSearchResults([]);
            setSelectedToAdd(null);
            setGroupName(initialGroupName);
            setGroupAvatar(initialGroupAvatar);
        }
    }, [open, fetchMembers, initialGroupName, initialGroupAvatar]);

    // Debounced user search for adding members
    useEffect(() => {
        if (addSearchTimer.current) clearTimeout(addSearchTimer.current);
        if (!addSearchQuery.trim()) {
            setAddSearchResults([]);
            setAddSearchLoading(false);
            return;
        }
        setAddSearchLoading(true);
        addSearchTimer.current = setTimeout(async () => {
            try {
                const res = await userService.search(addSearchQuery.trim(), 0, 10);
                const items = res.result?.items ?? [];
                setAddSearchResults(
                    items.filter(
                        (u) =>
                            u.id !== currentUser?.id &&
                            !members.some((m) => m.userId === u.id),
                    ),
                );
            } catch {
                // silently ignore
            } finally {
                setAddSearchLoading(false);
            }
        }, 300);
    }, [addSearchQuery, members, currentUser?.id]);

    // ── Actions ───────────────────────────────────────────────────────
    const handleAddMember = async () => {
        if (!selectedToAdd) return;
        setAddSubmitting(true);
        try {
            await groupService.addMember(conversationId, { userId: selectedToAdd.id });
            toast.success(`Đã thêm ${selectedToAdd.displayName} vào nhóm`);
            setSelectedToAdd(null);
            setAddSearchQuery("");
            setAddSearchResults([]);
            fetchMembers();
        } catch {
            toast.error("Không thể thêm thành viên");
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleRemoveMember = async (member: GroupMemberResponse) => {
        try {
            await groupService.removeMember(conversationId, member.userId);
            toast.success(`Đã xóa ${member.displayName} khỏi nhóm`);
            fetchMembers();
        } catch {
            toast.error("Không thể xóa thành viên");
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
            });
            toast.success("Đã lưu thông tin nhóm");
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

    return (
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

                <Tabs defaultValue="members" className="flex flex-1 min-h-0 flex-col">
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
                                    onClick={() => {
                                        setSelectedToAdd(null);
                                        setAddSearchQuery("");
                                    }}
                                >
                                    <UserPlus size={13} />
                                    Thêm
                                </Button>
                            )}
                        </div>

                        {/* Add-member search panel (always visible for admins) */}
                        {isOwnerOrAdmin && (
                            <div className="mb-3 shrink-0 space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Thêm thành viên mới
                                </p>
                                <div className="relative">
                                    <Search
                                        size={13}
                                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <Input
                                        placeholder="Tìm theo tên, username..."
                                        value={addSearchQuery}
                                        onChange={(e) => {
                                            setAddSearchQuery(e.target.value);
                                            setSelectedToAdd(null);
                                        }}
                                        className="h-8 pl-8 text-sm"
                                    />
                                    {addSearchLoading && (
                                        <Loader2
                                            size={13}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                                        />
                                    )}
                                </div>

                                {/* Results */}
                                {addSearchResults.length > 0 && (
                                    <div className="max-h-36 divide-y divide-border/50 overflow-y-auto rounded-md border border-border bg-background">
                                        {addSearchResults.map((u) => (
                                            <button
                                                type="button"
                                                key={u.id}
                                                onClick={() =>
                                                    setSelectedToAdd((prev) =>
                                                        prev?.id === u.id ? null : u,
                                                    )
                                                }
                                                className={cn(
                                                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50",
                                                    selectedToAdd?.id === u.id &&
                                                        "bg-brand/10 hover:bg-brand/15",
                                                )}
                                            >
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={u.avatarUrl} />
                                                    <AvatarFallback className="text-[11px]">
                                                        {u.displayName.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium">
                                                        {u.displayName}
                                                    </p>
                                                    <p className="truncate text-[10px] text-muted-foreground">
                                                        @{u.username}
                                                    </p>
                                                </div>
                                                {selectedToAdd?.id === u.id && (
                                                    <Check size={13} className="shrink-0 text-brand" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {addSearchQuery.trim() &&
                                    !addSearchLoading &&
                                    addSearchResults.length === 0 && (
                                        <p className="py-1 text-center text-[11px] text-muted-foreground">
                                            Không tìm thấy người dùng
                                        </p>
                                    )}

                                {selectedToAdd && (
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <p className="truncate text-xs text-muted-foreground">
                                            Thêm{" "}
                                            <span className="font-medium text-foreground">
                                                {selectedToAdd.displayName}
                                            </span>
                                        </p>
                                        <div className="flex shrink-0 gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={() => {
                                                    setSelectedToAdd(null);
                                                    setAddSearchQuery("");
                                                }}
                                            >
                                                <X size={13} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-7 px-3 text-xs"
                                                disabled={addSubmitting}
                                                onClick={handleAddMember}
                                            >
                                                {addSubmitting ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    "Xác nhận"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                            <div className="flex-1 space-y-4 pt-3">
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
                                        Ảnh đại diện (URL)
                                    </label>
                                    <Input
                                        value={groupAvatar}
                                        onChange={(e) => setGroupAvatar(e.target.value)}
                                        placeholder="https://..."
                                        className="h-9 text-sm"
                                    />
                                    {groupAvatar.trim() && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={groupAvatar} />
                                                <AvatarFallback>?</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground">
                                                Xem trước
                                            </span>
                                        </div>
                                    )}
                                </div>

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
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
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
