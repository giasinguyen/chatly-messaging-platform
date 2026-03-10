import { Search, ListFilter, MoreHorizontal, UsersRound } from "lucide-react";
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

export function ContactDetails() {
    const friends = [
        {
            id: 1,
            name: "AMuội",
            avatar: "https://i.pravatar.cc/150?u=1",
            initial: "A",
        },
        {
            id: 2,
            name: "Bảo Ngọc",
            avatar: "https://i.pravatar.cc/150?u=2",
            initial: "B",
        },
        {
            id: 3,
            name: "Baus Quy Dao",
            avatar: "https://i.pravatar.cc/150?u=3",
            initial: "B",
        },
        {
            id: 4,
            name: "Bùi Thị Diễm My",
            avatar: "https://i.pravatar.cc/150?u=4",
            initial: "B",
        },
        {
            id: 5,
            name: "Daddy",
            avatar: "https://i.pravatar.cc/150?u=5",
            initial: "D",
        },
        {
            id: 6,
            name: "Đào Quốc Tuấn",
            avatar: "https://i.pravatar.cc/150?u=6",
            initial: "D",
        },
        {
            id: 7,
            name: "Di Tư",
            avatar: "https://i.pravatar.cc/150?u=7",
            initial: "D",
        },
    ];

    // Group by first letter
    const grouped = friends.reduce(
        (acc, current) => {
            const letter = current.initial;
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(current);
            return acc;
        },
        {} as Record<string, typeof friends>,
    );

    return (
        <main className="flex-1 bg-background flex flex-col overflow-hidden">
            {/* Toolbar */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold text-foreground">
                        Danh sách bạn bè
                    </h2>
                </div>
            </header>

            {/* Filters */}
            <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                    Bạn bè (30)
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm bạn"
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

                    <Select defaultValue="all">
                        <SelectTrigger className="w-[140px] h-9 bg-card">
                            <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="online">Trực tuyến</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="py-2">
                        {Object.entries(grouped).map(([letter, items]) => (
                            <div key={letter} className="mb-4">
                                <div className="px-6 py-2 text-sm font-bold text-foreground border-b border-border/30">
                                    {letter}
                                </div>
                                <div className="flex flex-col">
                                    {items.map((friend) => (
                                        <div
                                            key={friend.id}
                                            className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage
                                                        src={friend.avatar}
                                                    />
                                                    <AvatarFallback>
                                                        {friend.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium text-foreground">
                                                    {friend.name}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full text-muted-foreground transition-all"
                                            >
                                                <MoreHorizontal size={18} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </main>
    );
}

