import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
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
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/auth.store";
import type { ContactResponse } from "@/types/contact";
import type { Attachment } from "@/types/message";
import type { Post } from "@/types/post";

interface SharePostDialogProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShared: (updatedPost: Post) => void;
}

interface ShareFriend {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

function getOtherUser(contact: ContactResponse, currentUserId: string | undefined): ShareFriend {
    const user = contact.user.id === currentUserId ? contact.contact : contact.user;
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
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
    const [friends, setFriends] = useState<ShareFriend[]>([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const previewAttachment = useMemo(() => buildPreviewAttachment(post), [post]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let isActive = true;
        setIsLoadingFriends(true);
        contactService
            .getByStatus("ACCEPTED")
            .then((response) => {
                if (!isActive) return;
                const nextFriends = (response.result ?? []).map((contact) =>
                    getOtherUser(contact, currentUser?.id),
                );
                setFriends(nextFriends);
            })
            .catch(() => {
                if (!isActive) return;
                toast.error("Could not load friends list.");
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingFriends(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [open, currentUser?.id]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedFriendIds([]);
        }
    }, [open]);

    const filteredFriends = friends.filter((friend) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            friend.displayName.toLowerCase().includes(query) ||
            friend.username.toLowerCase().includes(query)
        );
    });

    const toggleFriend = (friendId: string) => {
        setSelectedFriendIds((current) =>
            current.includes(friendId)
                ? current.filter((id) => id !== friendId)
                : [...current, friendId],
        );
    };

    const handleShare = async () => {
        if (!currentUser?.id) {
            toast.error("You need to sign in to share posts.");
            return;
        }

        if (selectedFriendIds.length === 0) {
            toast.error("Select at least one friend.");
            return;
        }

        setIsSharing(true);
        try {
            const conversationsRes = await conversationService.getMyConversations();
            const conversations = conversationsRes.result ?? [];
            const targetFriends = friends.filter((friend) => selectedFriendIds.includes(friend.id));

            await Promise.all(
                targetFriends.map(async (friend) => {
                    const existingConversation = conversations.find(
                        (conversation) =>
                            conversation.type === "PRIVATE" &&
                            conversation.participantIds.includes(friend.id) &&
                            conversation.participantIds.includes(currentUser.id),
                    );

                    const conversation =
                        existingConversation ??
                        (await conversationService.create({
                            type: "PRIVATE",
                            participantIds: [friend.id],
                        })).result;

                    if (!conversation) {
                        throw new Error("Unable to open conversation");
                    }

                    await messageService.send({
                        conversationId: conversation.id,
                        content: "Shared a post",
                        attachments: [previewAttachment],
                    });
                }),
            );

            const shareResponse = await postService.sharePost(post.id);
            if (shareResponse.result) {
                onShared(shareResponse.result);
            }
            toast.success(`Shared with ${targetFriends.length} friend${targetFriends.length > 1 ? "s" : ""}.`);
            onOpenChange(false);
        } catch {
            toast.error("Could not share post.");
        } finally {
            setIsSharing(false);
        }
    };

    const selectedCount = selectedFriendIds.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share post</DialogTitle>
                    <DialogDescription>
                        Choose one or more friends. They will receive a mini preview of this post in chat.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-muted/30 p-3">
                        <div className="flex items-start gap-3">
                            {post.mediaUrls[0] ? (
                                <img
                                    src={post.mediaUrls[0]}
                                    alt={post.content}
                                    className="h-20 w-20 rounded-xl object-cover shrink-0"
                                />
                            ) : (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-background text-xs text-muted-foreground">
                                    No image
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{post.authorDisplayName ?? "Post"}</p>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {post.content}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search friends"
                            className="pl-9"
                        />
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {isLoadingFriends ? (
                            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading friends...
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No friends found.
                            </div>
                        ) : (
                            filteredFriends.map((friend) => {
                                const isSelected = selectedFriendIds.includes(friend.id);
                                return (
                                    <button
                                        key={friend.id}
                                        type="button"
                                        onClick={() => toggleFriend(friend.id)}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                                            isSelected
                                                ? "border-brand/40 bg-brand/5"
                                                : "border-border bg-background hover:bg-muted/60",
                                        )}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                                            <AvatarFallback>{friend.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">
                                                {friend.displayName}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                @{friend.username}
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
