import { Check, X, Unlock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ContactTab } from "../index";
import type { ContactResponse } from "@/types/contact";
import { FriendActions } from "./FriendActions";

interface ContactItemProps {
    contact: ContactResponse;
    currentUserId: string;
    activeTab: ContactTab;
    isOnline?: boolean;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onMessage: (friendId: string) => void;
    onUnblock: (contactId: string, name: string) => void;
    onBlock: (contactId: string, name: string) => void;
    onRemove: (contactId: string, name: string) => void;
}

export function ContactItem({
    contact,
    currentUserId,
    activeTab,
    isOnline,
    onAccept,
    onReject,
    onMessage,
    onUnblock,
    onBlock,
    onRemove,
}: ContactItemProps) {
    const isIncoming = contact.contact.id === currentUserId;
    const otherUser = isIncoming ? contact.user : contact.contact;

    const renderAction = () => {
        if (activeTab === "requests") {
            if (isIncoming) {
                return (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" onClick={() => onAccept(contact.id)} className="h-8">
                            <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onReject(contact.id)} className="h-8">
                            <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                    </div>
                );
            }
            return (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" onClick={() => onReject(contact.id)} className="h-8">
                        <X className="h-4 w-4 mr-1" /> Recall
                    </Button>
                </div>
            );
        }

        if (activeTab === "blocked") {
            return (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUnblock(contact.id, otherUser.displayName)}
                    className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Unlock className="h-4 w-4 mr-1" /> Unblock
                </Button>
            );
        }

        return (
            <FriendActions
                onMessage={() => onMessage(otherUser.id)}
                onBlock={() => onBlock(contact.id, otherUser.displayName)}
                onRemove={() => onRemove(contact.id, otherUser.displayName)}
            />
        );
    };

    return (
        <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors group">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={otherUser.avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                            {otherUser.displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {activeTab === "friends" && isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{otherUser.displayName}</span>
                    {activeTab === "requests" && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                            {isIncoming ? "Sent you a request" : "You sent a request"}
                        </span>
                    )}
                </div>
            </div>
            {renderAction()}
        </div>
    );
}
