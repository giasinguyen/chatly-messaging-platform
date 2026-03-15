import { useState, useEffect, useCallback } from "react";
import { groupService } from "@/services/group.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Crown,
    Shield,
    UserMinus,
    UserPlus,
    Loader2,
    Pencil,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import type { GroupMemberResponse, GroupRole } from "@/types/group";
import type { UserResponse } from "@/types/auth";

interface GroupManagementPanelProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<GroupRole, string> = {
    OWNER: "Trưởng nhóm",
    ADMIN: "Quản trị viên",
    MEMBER: "Thành viên",
};

const ROLE_ICONS: Record<GroupRole, React.ReactNode> = {
    OWNER: <Crown size={14} className="text-yellow-500" />,
    ADMIN: <Shield size={14} className="text-blue-500" />,
    MEMBER: null,
};

export function GroupManagementPanel({
    conversationId,
    open,
    onOpenChange,
}: GroupManagementPanelProps) {
    const { user: currentUser } = useAuthStore();
    const [members, setMembers] = useState<GroupMemberResponse[]>([]);
    const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [addUserId, setAddUserId] = useState("");
    const [groupName, setGroupName] = useState("");
    const [groupAvatar, setGroupAvatar] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const myRole = members.find((m) => m.userId === currentUser?.id)?.role;
    const isOwnerOrAdmin = myRole === "OWNER" || myRole === "ADMIN";

    const fetchMembers = useCallback(async () => {
        if (!conversationId) return;
        try {
            setLoading(true);
            const [membersRes, usersRes] = await Promise.all([
                groupService.getMembers(conversationId),
                userService.getAll(),
            ]);
            setMembers(membersRes.result ?? []);
            setAllUsers(usersRes.result ?? []);
        } catch {
            toast.error("Không thể tải danh sách thành viên");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (open) fetchMembers();
    }, [open, fetchMembers]);

    const handleAddMember = async () => {
        if (!addUserId.trim()) return;
        try {
            setSubmitting(true);
            await groupService.addMember(conversationId, { userId: addUserId });
            toast.success("Đã thêm thành viên");
            setAddUserId("");
            setShowAddDialog(false);
            fetchMembers();
        } catch {
            toast.error("Không thể thêm thành viên");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveMember = async (userId: string, displayName: string) => {
        try {
            await groupService.removeMember(conversationId, userId);
            toast.success(`Đã xóa ${displayName} khỏi nhóm`);
            fetchMembers();
        } catch {
            toast.error("Không thể xóa thành viên");
        }
    };

    const handleUpdateRole = async (userId: string, role: GroupRole) => {
        try {
            await groupService.updateRole(conversationId, userId, { role });
            toast.success("Đã cập nhật vai trò");
            fetchMembers();
        } catch {
            toast.error("Không thể cập nhật vai trò");
        }
    };

    const handleUpdateGroup = async () => {
        try {
            setSubmitting(true);
            await groupService.updateGroup(conversationId, {
                name: groupName || undefined,
                avatar: groupAvatar || undefined,
            });
            toast.success("Đã cập nhật thông tin nhóm");
            setShowEditDialog(false);
        } catch {
            toast.error("Không thể cập nhật nhóm");
        } finally {
            setSubmitting(false);
        }
    };

    // Users not yet in the group (for the add member dialog)
    const nonMembers = allUsers.filter(
        (u) => !members.some((m) => m.userId === u.id) && u.id !== currentUser?.id,
    );

    // Sort: OWNER first, then ADMIN, then MEMBER
    const sortedMembers = [...members].sort((a, b) => {
        const order: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
        return order[a.role] - order[b.role];
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users size={18} />
                        Quản lý nhóm
                    </DialogTitle>
                    <DialogDescription>
                        {members.length} thành viên
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 max-h-[400px]">
                        <div className="space-y-1">
                            {sortedMembers.map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/40 transition-colors"
                                >
                                    <Avatar className="h-9 w-9 border border-border/50">
                                        <AvatarImage src={member.avatar ?? undefined} />
                                        <AvatarFallback>
                                            {member.displayName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-foreground truncate">
                                                {member.displayName}
                                                {member.userId === currentUser?.id && (
                                                    <span className="text-muted-foreground ml-1">(Bạn)</span>
                                                )}
                                            </span>
                                            {ROLE_ICONS[member.role]}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            @{member.username} · {ROLE_LABELS[member.role]}
                                        </span>
                                    </div>

                                    {isOwnerOrAdmin && member.userId !== currentUser?.id && (
                                        <div className="flex items-center gap-1">
                                            {/* Role Selector */}
                                            {(myRole === "OWNER" ||
                                                (myRole === "ADMIN" && member.role === "MEMBER")) && (
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(val) =>
                                                        handleUpdateRole(member.userId, val as GroupRole)
                                                    }
                                                >
                                                    <SelectTrigger className="h-7 w-auto text-xs px-2">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {myRole === "OWNER" && (
                                                            <SelectItem value="OWNER">Trưởng nhóm</SelectItem>
                                                        )}
                                                        <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                                                        <SelectItem value="MEMBER">Thành viên</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {/* Remove member (ADMIN can't remove OWNER/ADMIN) */}
                                            {(myRole === "OWNER" ||
                                                (myRole === "ADMIN" && member.role === "MEMBER")) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() =>
                                                        handleRemoveMember(member.userId, member.displayName)
                                                    }
                                                >
                                                    <UserMinus size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="flex-row gap-2">
                    {isOwnerOrAdmin && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEditDialog(true)}
                            >
                                <Pencil size={14} className="mr-1.5" />
                                Sửa nhóm
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowAddDialog(true)}
                            >
                                <UserPlus size={14} className="mr-1.5" />
                                Thêm thành viên
                            </Button>
                        </>
                    )}
                </DialogFooter>

                {/* Add Member Sub-Dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Thêm thành viên</DialogTitle>
                            <DialogDescription>
                                Chọn người dùng để thêm vào nhóm
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[300px]">
                            <div className="space-y-1">
                                {nonMembers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Không có người dùng nào để thêm
                                    </p>
                                ) : (
                                    nonMembers.map((u) => (
                                        <button
                                            type="button"
                                            key={u.id}
                                            className={`flex items-center gap-3 px-3 py-2 w-full rounded-md transition-colors text-left ${
                                                addUserId === u.id
                                                    ? "bg-brand/20 border border-brand/30"
                                                    : "hover:bg-muted/40"
                                            }`}
                                            onClick={() => setAddUserId(u.id)}
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.avatarUrl} />
                                                <AvatarFallback>
                                                    {u.displayName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{u.displayName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    @{u.username}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button
                                size="sm"
                                disabled={!addUserId || submitting}
                                onClick={handleAddMember}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : (
                                    <UserPlus size={14} className="mr-1.5" />
                                )}
                                Thêm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Group Sub-Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Sửa thông tin nhóm</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Tên nhóm
                                </label>
                                <Input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Nhập tên nhóm mới"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Avatar URL
                                </label>
                                <Input
                                    value={groupAvatar}
                                    onChange={(e) => setGroupAvatar(e.target.value)}
                                    placeholder="Nhập URL avatar nhóm"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                size="sm"
                                disabled={submitting || (!groupName && !groupAvatar)}
                                onClick={handleUpdateGroup}
                            >
                                {submitting && (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                )}
                                Lưu
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
