import { useState } from "react";
import {
    Search,
    UserPlus,
    UsersRound,
    UserCircle,
    UserMinus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContactTab } from "../index";
import { AddFriendDialog } from "./AddFriendDialog";
import { CreateGroupDialog } from "@/pages/app/chat/components/CreateGroupDialog";
import { useNavigate } from "react-router-dom";

interface ContactListProps {
    activeTab: ContactTab;
    onTabChange: (tab: ContactTab) => void;
}

export function ContactList({ activeTab, onTabChange }: ContactListProps) {
    const navigate = useNavigate();
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

    const categories: { id: ContactTab; label: string; icon: any }[] = [
        { id: "friends", label: "Friends list", icon: UserCircle },
        { id: "requests", label: "Friend requests", icon: UserPlus },
        { id: "blocked", label: "Blocked", icon: UserMinus },
    ];

    return (
        <aside className="w-[340px] flex flex-col border-r border-border bg-card shrink-0 z-10">
            {/* Search Header */}
            <div className="px-4 py-4 flex items-center gap-2 border-b border-border/50">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search"
                        className="h-8 pl-8 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand rounded-full text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => setIsAddFriendOpen(true)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        title="Add friend"
                    >
                        <UserPlus size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setIsCreateGroupOpen(true)}
                        title="Tạo nhóm chat"
                    >
                        <UsersRound size={16} />
                    </Button>
                </div>
            </div>

            {/* Contact Categories */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="flex flex-col py-2 px-2 gap-1">
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                onClick={() => onTabChange(cat.id)}
                                variant={
                                    activeTab === cat.id ? "secondary" : "ghost"
                                }
                                className={cn(
                                    "w-full justify-start h-auto py-3 px-3",
                                    activeTab === cat.id &&
                                        "bg-brand/10 text-brand hover:bg-brand/15",
                                )}
                            >
                                <cat.icon className="h-5 w-5 mr-2" />
                                <span className="font-medium">{cat.label}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <AddFriendDialog
                open={isAddFriendOpen}
                onOpenChange={setIsAddFriendOpen}
            />
            <CreateGroupDialog
                open={isCreateGroupOpen}
                onOpenChange={setIsCreateGroupOpen}
                onCreated={(conv) => navigate(`/chat/${conv.id}`)}
            />
        </aside>
    );
}
