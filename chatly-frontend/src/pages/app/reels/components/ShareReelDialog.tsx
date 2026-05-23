import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import { reelService } from "@/services/reel.service";
import { useAuthStore } from "@/store/auth.store";
import type { ContactResponse } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import type { Attachment } from "@/types/message";
import type { Reel } from "@/types/reel";

interface ShareReelDialogProps {
    reel: Reel | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShared: (updatedReel: Reel) => void;
}

type ShareTargetType = "FRIEND" | "GROUP";

interface ShareTarget {
    key: string;
    type: ShareTargetType;
    title: string;
    subtitle: string;
    avatarUrl?: string;
    conversationId?: string;
    participantId?: string;
}

function getOtherUser(contact: ContactResponse, currentUserId: string | undefined) {
    const user = contact.user.id === currentUserId ? contact.contact : contact.user;
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
}

function buildPreviewAttachment(
    reel: Reel,
    fallbackAuthorName?: string,
    fallbackAuthorAvatarUrl?: string,
): Attachment {
    const caption = reel.caption.trim().replace(/\s+/g, " ");
    const targetUrl = `/reels?reelId=${reel.id}`;
    const authorName = reel.authorDisplayName ?? reel.authorUsername ?? fallbackAuthorName ?? "Chatly user";
    return {
        kind: "REEL_PREVIEW",
        type: "application/x-chatly-reel-preview",
        url: reel.videoUrl,
        targetUrl,
        name: caption.slice(0, 60) || "Shared reel",
        postTitle: caption.slice(0, 80) || "Shared reel",
        postExcerpt: caption.slice(0, 180) || "Open this reel to watch the video.",
        postAuthorName: authorName,
        postAuthorAvatarUrl: reel.authorAvatarUrl ?? fallbackAuthorAvatarUrl,
        reelId: reel.id,
        reelCaption: caption.slice(0, 180) || "Open this reel to watch the video.",
        reelVideoUrl: reel.videoUrl,
        reelAuthorName: authorName,
        reelAuthorAvatarUrl: reel.authorAvatarUrl ?? fallbackAuthorAvatarUrl,
    };
}

export function ShareReelDialog({ reel, open, onOpenChange, onShared }: ShareReelDialogProps) {
    const currentUser = useAuthStore((state) => state.user);
    const [targets, setTargets] = useState<ShareTarget[]>([]);
    const [selectedTargetKeys, setSelectedTargetKeys] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingTargets, setIsLoadingTargets] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const previewAttachment = useMemo(
        () => (reel ? buildPreviewAttachment(reel, currentUser?.displayName, currentUser?.avatarUrl) : null),
        [currentUser?.avatarUrl, currentUser?.displayName, reel],
    );

    useEffect(() => {
        if (!open) return;

        let isActive = true;
        setIsLoadingTargets(true);

        Promise.all([
            contactService.getByStatus("ACCEPTED"),
            conversationService.getMyConversations(),
        ])
            .then(([friendsResponse, conversationsResponse]) => {
                if (!isActive) return;

                const conversations = conversationsResponse.result ?? [];
                const privateConversationsByParticipantId = new Map<string, ConversationResponse>();

                conversations.forEach((conversation) => {
                    if (conversation.type !== "PRIVATE") return;
                    const otherParticipantId = conversation.participantIds.find(
                        (participantId) => participantId !== currentUser?.id,
                    );
                    if (otherParticipantId) {
                        privateConversationsByParticipantId.set(otherParticipantId, conversation);
                    }
                });

                const friendTargets: ShareTarget[] = (friendsResponse.result ?? []).map((contact: ContactResponse) => {
                    const friend = getOtherUser(contact, currentUser?.id);
                    const existingConversation = privateConversationsByParticipantId.get(friend.id);
                    return {
                        key: `friend:${friend.id}`,
                        type: "FRIEND",
                        title: friend.displayName,
                        subtitle: `@${friend.username}`,
                        avatarUrl: friend.avatarUrl,
                        conversationId: existingConversation?.id,
                        participantId: friend.id,
                    };
                });

                const groupTargets: ShareTarget[] = conversations
                    .filter((conversation) => conversation.type === "GROUP")
                    .map((conversation) => ({
                        key: `group:${conversation.id}`,
                        type: "GROUP",
                        title: conversation.name ?? "Group chat",
                        subtitle: `${conversation.participantIds.length} members`,
                        avatarUrl: conversation.avatarUrl ?? undefined,
                        conversationId: conversation.id,
                    }));

                setTargets([...friendTargets, ...groupTargets]);
            })
            .catch(() => {
                if (isActive) toast.error("Could not load sharing targets.");
            })
            .finally(() => {
                if (isActive) setIsLoadingTargets(false);
            });

        return () => {
            isActive = false;
        };
    }, [open, currentUser?.id]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedTargetKeys([]);
        }
    }, [open]);

    const filteredTargets = targets.filter((target) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            target.title.toLowerCase().includes(query) ||
            target.subtitle.toLowerCase().includes(query)
        );
    });

    const toggleTarget = (targetKey: string) => {
        setSelectedTargetKeys((current) =>
            current.includes(targetKey)
                ? current.filter((key) => key !== targetKey)
                : [...current, targetKey],
        );
    };

    const handleShare = async () => {
        if (!currentUser?.id || !reel || !previewAttachment) {
            toast.error("You need to sign in to share reels.");
            return;
        }

        if (selectedTargetKeys.length === 0) {
            toast.error("Select at least one target.");
            return;
        }

        setIsSharing(true);
        try {
            const selectedTargets = targets.filter((target) => selectedTargetKeys.includes(target.key));

            await Promise.all(
                selectedTargets.map(async (target) => {
                    let conversationId = target.conversationId;

                    if (target.type === "FRIEND" && !conversationId) {
                        if (!target.participantId) {
                            throw new Error("Unable to determine conversation participant");
                        }
                        const createdConversation = await conversationService.create({
                            type: "PRIVATE",
                            participantIds: [target.participantId],
                        });
                        conversationId = createdConversation.result?.id;
                    }

                    if (!conversationId) {
                        throw new Error("Unable to open conversation");
                    }

                    await messageService.send({
                        conversationId,
                        content: "Shared a reel",
                        attachments: [previewAttachment],
                    });
                }),
            );

            const shareResponse = await reelService.share(reel.id);
            if (shareResponse.result) onShared(shareResponse.result);
            toast.success(
                `Shared with ${selectedTargets.length} target${selectedTargets.length > 1 ? "s" : ""}.`,
            );
            onOpenChange(false);
        } catch {
            toast.error("Could not share reel.");
        } finally {
            setIsSharing(false);
        }
    };

    const selectedCount = selectedTargetKeys.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share reel</DialogTitle>
                    <DialogDescription>
                        Choose one or more friends or groups. They will receive a mini preview of this reel in chat.
                    </DialogDescription>
                </DialogHeader>

                {reel && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-muted/30 p-3">
                            <div className="flex items-start gap-3">
                                <video
                                    src={reel.videoUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-20 w-20 shrink-0 rounded-xl bg-black object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        {reel.authorDisplayName ?? "Reel"}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                        {reel.caption || "Shared reel"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search friends or groups"
                                className="pl-9"
                            />
                        </div>

                        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                            {isLoadingTargets ? (
                                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading targets...
                                </div>
                            ) : filteredTargets.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">
                                    No targets found.
                                </div>
                            ) : (
                                filteredTargets.map((target) => {
                                    const isSelected = selectedTargetKeys.includes(target.key);
                                    return (
                                        <button
                                            key={target.key}
                                            type="button"
                                            onClick={() => toggleTarget(target.key)}
                                            className={cn(
                                                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                                                isSelected
                                                    ? "border-brand/40 bg-brand/5"
                                                    : "border-border bg-background hover:bg-muted/60",
                                            )}
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={target.avatarUrl} alt={target.title} />
                                                <AvatarFallback>{target.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">{target.title}</p>
                                                <p className="truncate text-xs text-muted-foreground">{target.subtitle}</p>
                                            </div>
                                            <Badge variant="outline" className="mr-2 text-[10px] uppercase tracking-wide">
                                                {target.type}
                                            </Badge>
                                            <div
                                                className={cn(
                                                    "flex h-5 w-5 items-center justify-center rounded-full border",
                                                    isSelected ? "border-brand bg-brand text-white" : "border-border bg-background",
                                                )}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleShare} disabled={isSharing || selectedCount === 0}>
                        {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Share {selectedCount > 0 ? `(${selectedCount})` : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
