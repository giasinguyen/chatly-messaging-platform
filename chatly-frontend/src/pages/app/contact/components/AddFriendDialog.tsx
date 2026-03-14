import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userService } from "@/services/user.service";
import { contactService } from "@/services/contact.service";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

interface AddFriendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
    const { user: currentUser } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setUsers([]);
        }
    }, [open]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await userService.getAll();
            if (res.result) {
                // Filter users locally based on query and exclude current user
                const filtered = res.result.filter((u) => {
                    if (u.id === currentUser?.id) return false;
                    const query = searchQuery.toLowerCase();
                    return (
                        u.displayName?.toLowerCase().includes(query) ||
                        u.email?.toLowerCase().includes(query) ||
                        u.phone?.includes(query)
                    );
                });
                setUsers(filtered);
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi tìm kiếm người dùng");
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await contactService.sendRequest({ contactId: userId });
            toast.success("Đã gửi lời mời kết bạn");
            // Cập nhật lại list users sau khi gửi nếu cần
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Không thể gửi lời mời kết bạn");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Thêm bạn</DialogTitle>
                    <DialogDescription>
                        Tìm kiếm bằng số điện thoại, email hoặc tên.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <Input
                        placeholder="Nhập số điện thoại, email hoặc tên"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Tìm"}
                    </Button>
                </div>
                <div className="mt-4 flex flex-col gap-3 min-h-[150px] max-h-[300px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm">Đang tìm kiếm...</span>
                        </div>
                    ) : users.length > 0 ? (
                        users.map((u) => (
                            <div key={u.id} className="flex justify-between items-center bg-muted/40 p-2 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={u.avatarUrl} className="object-cover" />
                                        <AvatarFallback>
                                            {u.displayName?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{u.displayName}</p>
                                        <p className="text-xs text-muted-foreground">{u.email || u.phone || `@${u.username}`}</p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleAddFriend(u.id)}
                                >
                                    Kết bạn
                                </Button>
                            </div>
                        ))
                    ) : searchQuery && !loading ? (
                        <div className="flex items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm">Không tìm thấy ai</span>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
