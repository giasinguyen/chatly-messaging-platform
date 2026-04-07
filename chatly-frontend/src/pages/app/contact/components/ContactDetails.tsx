import { useState, useEffect } from "react";
import { Search, ListFilter, MoreHorizontal, UsersRound, Check, X, Unlock, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ContactTab } from "../index";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import type { ContactResponse } from "@/types/contact";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ContactDetailsProps {
    activeTab: ContactTab;
}

export function ContactDetails({ activeTab }: ContactDetailsProps) {
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<ContactResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchContacts = async () => {
        setLoading(true);
        try {
            let statusQuery = "ACCEPTED";
            if (activeTab === "requests") statusQuery = "PENDING";
            if (activeTab === "blocked") statusQuery = "BLOCKED";
            
            const res = await contactService.getByStatus(statusQuery as any);
            if (res.result) {
                setContacts(res.result);
            }
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải danh sách liên hệ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [activeTab]);

    const handleAccept = async (id: string) => {
        try {
            await contactService.accept(id);
            toast.success("Đã chấp nhận kết bạn");
            fetchContacts();
        } catch (error) {
            toast.error("Lỗi khi chấp nhận kết bạn");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await contactService.delete(id);
            toast.success("Đã từ chối kết bạn");
            fetchContacts();
        } catch (error) {
            toast.error("Lỗi khi từ chối kết bạn");
        }
    };

    const handleUnblock = async (id: string) => {
        try {
             await contactService.delete(id);
             toast.success("Đã bỏ chặn thành công");
             fetchContacts();
        } catch (error) {
             toast.error("Lỗi khi bỏ chặn");
        }
    };

    const handleMessage = async (friendId: string) => {
        try {
            // Check for an existing private conversation with this friend first
            const convsRes = await conversationService.getMyConversations();
            const existing = convsRes.result?.find(
                (c) =>
                    c.type === "PRIVATE" &&
                    c.participantIds.includes(friendId) &&
                    c.participantIds.includes(currentUser!.id),
            );
            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }
            // No existing conversation — create one
            const res = await conversationService.create({
                type: "PRIVATE",
                participantIds: [friendId],
            });
            if (res.result) {
                navigate(`/chat/${res.result.id}`);
            }
        } catch (error) {
            toast.error("Không thể tạo cuộc trò chuyện");
        }
    };

    // Filter contacts based on search query
    const filteredContacts = contacts.filter(c => {
         if (!searchQuery.trim()) return true;
         const otherUser = c.user.id === currentUser?.id ? c.contact : c.user;
         const name = otherUser.displayName || "";
         return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Group by first letter (for Friends tab only)
    const grouped = filteredContacts.reduce((acc, current) => {
        const otherUser = current.user.id === currentUser?.id ? current.contact : current.user;
        const letter = otherUser.displayName?.charAt(0).toUpperCase() || "#";
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(current);
        return acc;
    }, {} as Record<string, typeof contacts>);

    const renderContactAction = (contact: ContactResponse) => {
        const isIncoming = contact.contact.id === currentUser?.id;
        const otherUserId = isIncoming ? contact.user.id : contact.contact.id;

        if (activeTab === "requests") {
            if (isIncoming) {
                return (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" onClick={() => handleAccept(contact.id)} className="h-8">
                            <Check className="h-4 w-4 mr-1" /> Chấp nhận
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(contact.id)} className="h-8">
                            <X className="h-4 w-4 mr-1" /> Từ chối
                        </Button>
                    </div>
                );
            } else {
                return (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => handleReject(contact.id)} className="h-8">
                            <X className="h-4 w-4 mr-1" /> Thu hồi
                        </Button>
                    </div>
                );
            }
        }

        if (activeTab === "blocked") {
             return (
                 <Button size="sm" variant="outline" onClick={() => handleUnblock(contact.id)} className="h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Unlock className="h-4 w-4 mr-1" /> Bỏ chặn
                 </Button>
             );
        }

        // Friends tab
        return (
             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button size="sm" variant="ghost" onClick={() => handleMessage(otherUserId)} className="h-8 rounded-full px-3">
                     <MessageSquare className="h-4 w-4 mr-1" /> Nhắn tin
                 </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                     <MoreHorizontal size={18} />
                 </Button>
             </div>
        );
    };

    const getTitle = () => {
         if (activeTab === "requests") return "Lời mời kết bạn";
         if (activeTab === "blocked") return "Danh sách chặn";
         return "Danh sách bạn bè";
    };

    return (
        <main className="flex-1 bg-background flex flex-col overflow-hidden">
            {/* Toolbar */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold text-foreground">
                        {getTitle()}
                    </h2>
                </div>
            </header>

            {/* Filters */}
            <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                    Tổng cộng: {filteredContacts.length}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm bạn"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 bg-card border-border rounded-lg text-sm"
                        />
                    </div>

                    <Select defaultValue="name-asc">
                        <SelectTrigger className="w-[180px] h-9 bg-card">
                            <ListFilter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Tên (A-Z)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">Tên (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Tên (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>

                    {activeTab === "friends" && (
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[140px] h-9 bg-card">
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="online">Trực tuyến</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    {loading ? (
                         <div className="flex items-center justify-center p-8 text-muted-foreground">
                             Đang tải...
                         </div>
                    ) : (
                        <div className="py-2">
                            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
                                <div key={letter} className="mb-4">
                                    {activeTab === "friends" && (
                                        <div className="px-6 py-2 text-sm font-bold text-foreground border-b border-border/30">
                                            {letter}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        {items.map((contact) => {
                                            const otherUser = contact.user.id === currentUser?.id ? contact.contact : contact.user;
                                            const isIncoming = contact.contact.id === currentUser?.id;
                                            return (
                                                <div
                                                    key={contact.id}
                                                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage
                                                                src={otherUser.avatarUrl}
                                                                className="object-cover"
                                                            />
                                                            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                                                                {otherUser.displayName?.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {otherUser.displayName}
                                                            </span>
                                                            {activeTab === "requests" && (
                                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                                    {isIncoming ? "Đã gửi cho bạn lời mời" : "Bạn đã gửi lời mời"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {renderContactAction(contact)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {filteredContacts.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground">
                                    Không có dữ liệu
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </main>
    );
}

