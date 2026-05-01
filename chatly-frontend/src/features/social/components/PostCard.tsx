import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Heart, MessageCircle, Share2, Bookmark, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { postService } from "@/services/post.service";
import { usePostStore } from "@/store/post.store";
import { useAuthStore } from "@/store/auth.store";
import type { Post, PostComment, PostVisibility, ReactionType } from "@/types/post";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REACTION_EMOJIS: Record<ReactionType, string> = {
    LIKE: "👍",
    LOVE: "❤️",
    HAHA: "😂",
    WOW: "😮",
    SAD: "😢",
    ANGRY: "😡",
};

interface PostCardProps {
    post: Post;
    onPostUpdate?: (postId: string, updates: Partial<Post>) => void;
    onPostRemove?: (postId: string) => void;
}

const VISIBILITY_OPTIONS: PostVisibility[] = ["PUBLIC", "FOLLOWERS_ONLY", "FRIENDS_ONLY", "ONLY_ME"];

const isPostVisibility = (value: string): value is PostVisibility =>
    value === "PUBLIC" ||
    value === "FOLLOWERS_ONLY" ||
    value === "FRIENDS_ONLY" ||
    value === "ONLY_ME";

function PostCardBase({ post, onPostUpdate, onPostRemove }: PostCardProps) {
    const currentUser = useAuthStore((s) => s.user);
    const navigate = useNavigate();
    const currentUserId = currentUser?.id;
    const fallbackUpdate = usePostStore((s) => s.updatePost);
    const fallbackRemove = usePostStore((s) => s.removePost);
    const updatePost = onPostUpdate ?? fallbackUpdate;
    const removePost = onPostRemove ?? fallbackRemove;
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [editVisibility, setEditVisibility] = useState<PostVisibility>(post.visibility);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [commentDraft, setCommentDraft] = useState("");
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const lastMediaTapRef = useRef(0);

    const authorLabel =
        post.authorDisplayName ??
        (post.authorId === currentUserId && currentUser?.displayName
            ? currentUser.displayName
            : post.authorId);
    const authorAvatarUrl =
        post.authorAvatarUrl ??
        (post.authorId === currentUserId ? currentUser?.avatarUrl : undefined);
    const authorUsername =
        post.authorUsername ??
        (post.authorId === currentUserId ? currentUser?.username : undefined);
    const authorInitial = authorLabel.slice(0, 1).toUpperCase();
    const authorProfilePath = useMemo(() => {
        if (authorUsername) {
            return `/${authorUsername}`;
        }
        return null;
    }, [authorUsername]);

    const myReaction = post.reactions.find((r) => r.reactedByMe);
    const totalReactions = post.reactions.reduce((acc, r) => acc + r.count, 0);

    const handleReact = async (type: ReactionType) => {
        setPickerOpen(false);
        const isTogglingOff = myReaction?.type === type;
        try {
            const res = isTogglingOff
                ? await postService.removeReaction(post.id)
                : await postService.react(post.id, { type });

            if (res.code === 1000 && res.result) {
                updatePost(post.id, { reactions: res.result.reactions });
            }
        } catch {
            toast.error("Could not update reaction.");
        }
    };

    const handleDelete = async () => {
        try {
            await postService.delete(post.id);
            removePost(post.id);
            toast.success("Post deleted.");
        } catch {
            toast.error("Failed to delete post.");
        }
    };

    const handleEdit = () => {
        setEditContent(post.content);
        setEditVisibility(post.visibility);
        setIsEditing(true);
    };

    const handleAuthorNavigate = () => {
        if (!authorProfilePath) {
            return;
        }
        navigate(authorProfilePath);
    };

    const loadComments = async () => {
        setIsLoadingComments(true);
        try {
            const res = await postService.getComments(post.id);
            if (res.code === 1000 && res.result) {
                setComments(res.result);
            }
        } catch {
            toast.error("Could not load comments.");
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleOpenComments = () => {
        setIsCommentOpen(true);
    };

    const handleSubmitComment = async () => {
        const content = commentDraft.trim();
        if (!content) {
            toast.error("Comment cannot be empty.");
            return;
        }

        setIsSubmittingComment(true);
        try {
            const res = await postService.addComment(post.id, content);
            if (res.code === 1000 && res.result) {
                setComments((prev) => [res.result, ...prev]);
                setCommentDraft("");
                updatePost(post.id, { commentCount: post.commentCount + 1 });
            }
        } catch {
            toast.error("Could not add comment.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const triggerHeartBurst = () => {
        setShowHeartBurst(true);
        window.setTimeout(() => {
            setShowHeartBurst(false);
        }, 700);
    };

    const handleLikeFromMedia = async () => {
        if (myReaction?.type === "LIKE") {
            triggerHeartBurst();
            return;
        }

        try {
            const res = await postService.react(post.id, { type: "LIKE" });
            if (res.code === 1000 && res.result) {
                updatePost(post.id, { reactions: res.result.reactions });
            }
            triggerHeartBurst();
        } catch {
            toast.error("Could not like post.");
        }
    };

    const handleMediaTouchEnd = () => {
        const now = Date.now();
        if (now - lastMediaTapRef.current < 280) {
            void handleLikeFromMedia();
        }
        lastMediaTapRef.current = now;
    };

    const handleSave = async () => {
        if (isSavingPost) return;
        setIsSavingPost(true);
        try {
            if (post.savedByMe) {
                await postService.unsavePost(post.id);
                updatePost(post.id, { savedByMe: false });
                toast.success("Post removed from saved list.");
            } else {
                await postService.savePost(post.id);
                updatePost(post.id, { savedByMe: true });
                toast.success("Post saved.");
            }
        } catch {
            toast.error("Could not update saved post.");
        } finally {
            setIsSavingPost(false);
        }
    };

    const handleSubmitEdit = async () => {
        const content = editContent.trim();
        if (!content) {
            toast.error("Post content cannot be empty.");
            return;
        }

        setIsSubmittingEdit(true);
        try {
            const res = await postService.update(post.id, {
                content,
                visibility: editVisibility,
            });

            if (res.code === 1000 && res.result) {
                updatePost(post.id, {
                    content: res.result.content,
                    visibility: res.result.visibility,
                    hashtags: res.result.hashtags,
                    updatedAt: res.result.updatedAt,
                });
                setIsEditing(false);
                toast.success("Post updated.");
            }
        } catch {
            toast.error("Failed to update post.");
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleEditVisibilityChange = (value: string) => {
        if (isPostVisibility(value)) {
            setEditVisibility(value);
        }
    };

    useEffect(() => {
        if (!isCommentOpen) {
            return;
        }
        void loadComments();
    }, [isCommentOpen]);

    return (
        <>
            <article className="rounded-3xl bg-card shadow-sm border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <button
                    type="button"
                    onClick={handleAuthorNavigate}
                    className="flex items-center gap-2.5 min-w-0 text-left"
                    disabled={!authorProfilePath}
                >
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground flex-shrink-0 overflow-hidden">
                        {authorAvatarUrl ? (
                            <img
                                src={authorAvatarUrl}
                                alt={authorLabel}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            authorInitial
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate hover:underline">{authorLabel}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            className="rounded-lg text-muted-foreground"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 z-[120]">
                        {currentUserId === post.authorId && (
                            <DropdownMenuItem onClick={handleEdit}>
                                <PenLine className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleSave} disabled={isSavingPost}>
                            <Bookmark className="mr-2 h-4 w-4" />
                            {post.savedByMe ? "Unsave" : "Save"}
                        </DropdownMenuItem>
                        {currentUserId === post.authorId && (
                            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            <p className="px-5 py-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {post.content}
            </p>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-5 pb-2">
                    {post.hashtags.map((tag) => (
                        <span key={tag} className="text-xs text-indigo-500 hover:underline cursor-pointer">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Media grid */}
            {post.mediaUrls.length > 0 && (
                <div className={cn("grid gap-0.5", post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {post.mediaUrls.slice(0, 4).map((url, idx) => (
                        <div
                            key={url}
                            className="relative aspect-video bg-muted"
                            onDoubleClick={() => void handleLikeFromMedia()}
                            onTouchEnd={handleMediaTouchEnd}
                        >
                            {url.match(/\.(mp4|webm)$/i) ? (
                                <video src={url} className="w-full h-full object-cover" muted controls />
                            ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                            {showHeartBurst && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <Heart className="h-16 w-16 fill-pink-500 text-pink-500 opacity-90 animate-pulse" />
                                </div>
                            )}
                            {idx === 3 && post.mediaUrls.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                                    +{post.mediaUrls.length - 4}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-1 px-4 py-3 border-t border-border">
                {/* Reaction button with picker */}
                <div className="relative">
                    {pickerOpen && (
                        <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-2xl bg-card shadow-lg border border-border px-3 py-2 z-10">
                            {(Object.entries(REACTION_EMOJIS) as [ReactionType, string][]).map(
                                ([type, emoji]) => (
                                    <button
                                        key={type}
                                        onClick={() => handleReact(type)}
                                        className="text-xl hover:scale-125 transition-transform"
                                        title={type}
                                    >
                                        {emoji}
                                    </button>
                                ),
                            )}
                        </div>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "gap-1.5 rounded-xl text-xs font-normal",
                            myReaction ? "text-pink-500" : "text-muted-foreground",
                        )}
                        onMouseEnter={() => setPickerOpen(true)}
                        onMouseLeave={() => setPickerOpen(false)}
                        onClick={() => handleReact(myReaction ? myReaction.type : "LIKE")}
                    >
                        <Heart className={cn("size-4", myReaction && "fill-pink-500")} />
                        {totalReactions > 0 && totalReactions}
                    </Button>
                </div>

                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 rounded-xl text-xs font-normal text-muted-foreground"
                    onClick={handleOpenComments}
                >
                    <MessageCircle className="size-4" />
                    {post.commentCount > 0 && post.commentCount}
                </Button>

                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 rounded-xl text-xs font-normal text-muted-foreground"
                >
                    <Share2 className="size-4" />
                    {post.shareCount > 0 && post.shareCount}
                </Button>
            </div>
            </article>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit post</DialogTitle>
                        <DialogDescription>
                            Update your content and visibility.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <Textarea
                            value={editContent}
                            onChange={(event) => setEditContent(event.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                        <Select
                            value={editVisibility}
                            onValueChange={handleEditVisibilityChange}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {VISIBILITY_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={isSubmittingEdit}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSubmitEdit} disabled={isSubmittingEdit}>
                            {isSubmittingEdit ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCommentOpen} onOpenChange={setIsCommentOpen}>
                <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 h-[80vh]">
                        <div className="bg-black relative flex items-center justify-center">
                            {post.mediaUrls.length > 0 ? (
                                post.mediaUrls[0].match(/\.(mp4|webm)$/i) ? (
                                    <video
                                        src={post.mediaUrls[0]}
                                        className="h-full w-full object-contain"
                                        controls
                                        onDoubleClick={() => void handleLikeFromMedia()}
                                        onTouchEnd={handleMediaTouchEnd}
                                    />
                                ) : (
                                    <img
                                        src={post.mediaUrls[0]}
                                        alt="Post media"
                                        className="h-full w-full object-contain"
                                        onDoubleClick={() => void handleLikeFromMedia()}
                                        onTouchEnd={handleMediaTouchEnd}
                                    />
                                )
                            ) : (
                                <div className="text-sm text-muted-foreground">No media</div>
                            )}
                            {showHeartBurst && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <Heart className="h-20 w-20 fill-pink-500 text-pink-500 opacity-95 animate-pulse" />
                                </div>
                            )}
                        </div>

                        <div className="flex h-full flex-col bg-card">
                            <DialogHeader className="px-4 py-3 border-b border-border">
                                <DialogTitle className="text-base">Comments</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Join the conversation on this post.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                {isLoadingComments ? (
                                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                                ) : comments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                                ) : (
                                    comments.map((comment) => {
                                        const commentInitial = comment.userDisplayName.slice(0, 1).toUpperCase();
                                        return (
                                            <div key={comment.id} className="flex items-start gap-2.5">
                                                <button
                                                    type="button"
                                                    className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0"
                                                    onClick={() => {
                                                        if (comment.userUsername) {
                                                            navigate(`/${comment.userUsername}`);
                                                        }
                                                    }}
                                                >
                                                    {comment.userAvatarUrl ? (
                                                        <img
                                                            src={comment.userAvatarUrl}
                                                            alt={comment.userDisplayName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                                            {commentInitial}
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex-1">
                                                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                                                        <button
                                                            type="button"
                                                            className="text-sm font-medium text-foreground hover:underline"
                                                            onClick={() => {
                                                                if (comment.userUsername) {
                                                                    navigate(`/${comment.userUsername}`);
                                                                }
                                                            }}
                                                        >
                                                            {comment.userDisplayName}
                                                        </button>
                                                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                    <span className="mt-1 block text-[11px] text-muted-foreground">
                                                        {new Date(comment.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="border-t border-border px-4 py-3 space-y-2">
                                <Textarea
                                    value={commentDraft}
                                    onChange={(event) => setCommentDraft(event.target.value)}
                                    rows={2}
                                    placeholder="Add a comment..."
                                    className="resize-none"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={handleSubmitComment}
                                        disabled={isSubmittingComment}
                                    >
                                        {isSubmittingComment ? "Posting..." : "Post"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
    if (left === right) return true;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) return false;
    }
    return true;
}

function areReactionsEqual(left: Post["reactions"], right: Post["reactions"]): boolean {
    if (left === right) return true;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
        const a = left[i];
        const b = right[i];
        if (a.type !== b.type || a.count !== b.count || a.reactedByMe !== b.reactedByMe) {
            return false;
        }
    }
    return true;
}

function arePostsEqual(prev: PostCardProps, next: PostCardProps): boolean {
    const prevPost = prev.post;
    const nextPost = next.post;

    if (prevPost === nextPost) return true;
    if (prevPost.id !== nextPost.id) return false;
    if (prevPost.updatedAt !== nextPost.updatedAt) return false;
    if (prevPost.content !== nextPost.content) return false;
    if (prevPost.visibility !== nextPost.visibility) return false;
    if (prevPost.savedByMe !== nextPost.savedByMe) return false;
    if (prevPost.authorDisplayName !== nextPost.authorDisplayName) return false;
    if (prevPost.authorAvatarUrl !== nextPost.authorAvatarUrl) return false;
    if (prevPost.commentCount !== nextPost.commentCount) return false;
    if (prevPost.shareCount !== nextPost.shareCount) return false;
    if (!areStringArraysEqual(prevPost.mediaUrls, nextPost.mediaUrls)) return false;
    if (!areStringArraysEqual(prevPost.hashtags, nextPost.hashtags)) return false;
    if (!areReactionsEqual(prevPost.reactions, nextPost.reactions)) return false;

    return true;
}

export const PostCard = memo(PostCardBase, arePostsEqual);
