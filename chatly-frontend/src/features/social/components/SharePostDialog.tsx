import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PostSharePreview } from "@/features/social/components/PostSharePreview";
import { conversationService } from "@/services/conversation.service";
import { useShareTargets } from "@/features/social/hooks/useShareTargets";
import { messageService } from "@/services/message.service";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/auth.store";
import type { Attachment } from "@/types/message";
import type { Post } from "@/types/post";

interface SharePostDialogProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShared: (updatedPost: Post) => void;
}

type ShareTargetKind = "FRIEND" | "GROUP";

interface ShareTarget {
    key: string;
    title: string;
    subtitle: string;
    avatarUrl?: string | null;
    role?: string;
}

function toTargetKey(kind: ShareTargetKind, id: string): string {
    return `${kind}:${id}`;
}

function buildPreviewAttachment(post: Post): Attachment {
    const previewText = post.content.trim().replace(/\s+/g, " ");
    return {
        kind: "POST_PREVIEW",
        type: "application/x-chatly-post-preview",
        url: `/post/${post.id}`,
        targetUrl: `/post/${post.id}`,
        name: post.content.slice(0, 60) || "Shared post",
        postId: post.id,
        postTitle: previewText.slice(0, 80) || "Shared post",
        postExcerpt: previewText.slice(0, 180) || "Open this post to see the full content.",
        postImageUrl: post.mediaUrls[0],
        postAuthorName: post.authorDisplayName ?? "Unknown author",
        postAuthorAvatarUrl: post.authorAvatarUrl,
    };
}

export function SharePostDialog({ post, open, onOpenChange, onShared }: SharePostDialogProps) {
    const currentUser = useAuthStore((state) => state.user);
    const { friends, privateConversations, groupConversations, isLoadingTargets } = useShareTargets(
        open,
        currentUser?.id,
    );
    const [selectedTargetKeys, setSelectedTargetKeys] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    const previewAttachment = useMemo(() => buildPreviewAttachment(post), [post]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedTargetKeys([]);
        }
    }, [open]);

    const targets = useMemo<ShareTarget[]>(
        () => [
            ...friends.map((friend) => ({
                key: toTargetKey("FRIEND", friend.id),
                title: friend.displayName,
                subtitle: `@${friend.username}`,
                avatarUrl: friend.avatarUrl,
                role: friend.role,
            })),
            ...groupConversations.map((conversation) => ({
                key: toTargetKey("GROUP", conversation.id),
                title: conversation.name,
                subtitle: "Group chat",
                avatarUrl: conversation.avatarUrl,
            })),
        ],
        [friends, groupConversations],
    );

    const filteredTargets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return targets;
        }

        return targets.filter((target) => {
            return (
                target.title.toLowerCase().includes(query) ||
                target.subtitle.toLowerCase().includes(query)
            );
        });
    }, [searchQuery, targets]);

    const toggleTarget = (targetKey: string) => {
        setSelectedTargetKeys((current) =>
            current.includes(targetKey)
                ? current.filter((key) => key !== targetKey)
                : [...current, targetKey],
        );
    };

    const handleShare = async () => {
        if (!currentUser?.id) {
            toast.error("You need to sign in to share posts.");
            return;
        }

        if (selectedTargetKeys.length === 0) {
            toast.error("Select at least one friend or group.");
            return;
        }

        setIsSharing(true);
        try {
            const targetFriends = friends.filter((friend) =>
                selectedTargetKeys.includes(toTargetKey("FRIEND", friend.id)),
            );
            const targetGroups = groupConversations.filter((conversation) =>
                selectedTargetKeys.includes(toTargetKey("GROUP", conversation.id)),
            );

            const friendConversationIds = await Promise.all(
                targetFriends.map(async (friend) => {
                    const existingConversation = privateConversations.find(
                        (conversation) =>
                            conversation.participantIds.includes(friend.id) &&
                            conversation.participantIds.includes(currentUser.id),
                    );

                    if (existingConversation) {
                        return existingConversation.id;
                    }

                    const createdConversationResponse = await conversationService.create({
                        type: "PRIVATE",
                        participantIds: [friend.id],
                    });

                    if (!createdConversationResponse.result) {
                        throw new Error("Unable to open conversation");
                    }

                    return createdConversationResponse.result.id;
                }),
            );

            const targetConversationIds = [
                ...new Set([
                    ...friendConversationIds,
                    ...targetGroups.map((conversation) => conversation.id),
                ]),
            ];

            await Promise.all(
                targetConversationIds.map(async (conversationId) => {
                    await messageService.send({
                        conversationId,
                        content: "Shared a post",
                        attachments: [previewAttachment],
                    });
                }),
            );

            const shareResponse = await postService.sharePost(post.id);
            if (shareResponse.result) {
                onShared(shareResponse.result);
            }

            const summaryParts: string[] = [];
            if (targetFriends.length > 0) {
                summaryParts.push(
                    `${targetFriends.length} friend${targetFriends.length > 1 ? "s" : ""}`,
                );
            }
            if (targetGroups.length > 0) {
                summaryParts.push(
                    `${targetGroups.length} group${targetGroups.length > 1 ? "s" : ""}`,
                );
            }

            toast.success(`Shared with ${summaryParts.join(" and ")}.`);
            onOpenChange(false);
        } catch {
            toast.error("Could not share post.");
        } finally {
            setIsSharing(false);
        }
    };

    const selectedCount = selectedTargetKeys.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share post</DialogTitle>
                    <DialogDescription>
                        Choose friends or groups. They will receive a mini preview of this post in chat.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <PostSharePreview post={post} />

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
                                Loading friends and groups...
                            </div>
                        ) : filteredTargets.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No friends or groups found.
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
                                            <AvatarImage src={target.avatarUrl ?? undefined} alt={target.title} />
                                            <AvatarFallback>{target.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {target.title}
                                                </p>
                                                {target.role === "ADMIN" && (
                                                    <AdminBadge className="size-3.5" />
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {target.subtitle}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                "flex h-5 w-5 items-center justify-center rounded-full border",
                                                isSelected
                                                    ? "border-brand bg-brand text-white"
                                                    : "border-border bg-background",
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
