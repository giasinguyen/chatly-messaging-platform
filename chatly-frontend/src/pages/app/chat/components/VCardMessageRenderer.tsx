import { IdCard } from "lucide-react";
import type { ContactResponse } from "@/types/contact";

interface VCardData {
    id?: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
}

interface VCardMessageRendererProps {
    content: string;
    contacts: ContactResponse[];
    currentUserId: string;
    onAddFriend?: (userId: string) => void;
    onOpenSenderProfile?: (userId: string) => void;
}

function parseVCard(content: string): VCardData {
    try {
        return JSON.parse(content) as VCardData;
    } catch {
        return {};
    }
}

export function VCardMessageRenderer({
    content,
    contacts,
    currentUserId,
    onAddFriend,
    onOpenSenderProfile,
}: VCardMessageRendererProps) {
    const card = parseVCard(content);
    const cardId = card.id;

    const friendContact = cardId
        ? contacts.find((c) => c.contact.id === cardId || c.user.id === cardId)
        : undefined;
    const friendStatus = friendContact?.status;
    const isSelf = cardId === currentUserId;

    return (
        <div className="w-60 rounded-2xl border border-border/60 bg-background dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/40">
                <IdCard size={12} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground font-medium">
                    Contact card
                </span>
            </div>
            <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-12 h-12 rounded-full bg-brand/15 flex items-center justify-center text-base font-bold text-brand shrink-0 overflow-hidden ring-2 ring-brand/20">
                    {card.avatarUrl ? (
                        <img
                            src={card.avatarUrl}
                            alt=""
                            className="w-12 h-12 object-cover"
                        />
                    ) : (
                        <span>
                            {(card.displayName ?? "U").charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                        {card.displayName ?? "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        @{card.username ?? ""}
                    </p>
                </div>
            </div>
            {cardId && (
                <div className="border-t border-border/40 flex">
                    {isSelf || friendStatus === "ACCEPTED" ? (
                        <span className="flex-1 py-2 text-xs font-semibold text-green-600 text-center">
                            ✓ Friends
                        </span>
                    ) : friendStatus === "PENDING" ? (
                        <span className="flex-1 py-2 text-xs font-semibold text-muted-foreground text-center">
                            Request sent
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onAddFriend?.(cardId)}
                            className="flex-1 py-2 text-xs font-semibold text-brand hover:bg-brand/5 transition-colors"
                        >
                            Add friend
                        </button>
                    )}
                    {onOpenSenderProfile && (
                        <button
                            type="button"
                            onClick={() => onOpenSenderProfile(cardId)}
                            className="flex-1 py-2 text-xs font-semibold text-brand hover:bg-brand/5 transition-colors border-l border-border/40"
                        >
                            View profile
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
