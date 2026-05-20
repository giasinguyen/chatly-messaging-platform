import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Heart, MessageCircle, Share2, Bookmark, PenLine, Trash2, ChevronLeft, ChevronRight, Smile, CornerUpLeft, Image as ImageIcon, X, Globe, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
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
import { fileService } from "@/services/file.service";
import { usePostStore } from "@/store/post.store";
import { useAuthStore } from "@/store/auth.store";
import type { Post, PostComment, PostVisibility, ReactionType } from "@/types/post";
import { cn } from "@/lib/utils";
import { SharePostDialog } from "./SharePostDialog";
import { MediaUploadZone } from "./MediaUploadZone";
import { ImageLightbox } from "@/pages/app/chat/components/ImageLightbox";
import type { LightboxImage } from "@/pages/app/chat/components/messageList.utils";

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

interface CommentNode extends PostComment {
    children: CommentNode[];
}

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
    { value: "PUBLIC", label: "Everyone", icon: Globe },
    { value: "FOLLOWERS_ONLY", label: "Followers", icon: Users },
    { value: "FRIENDS_ONLY", label: "Friends", icon: Users },
    { value: "ONLY_ME", label: "Only me", icon: Lock },
];

const isPostVisibility = (value: string): value is PostVisibility =>
    value === "PUBLIC" ||
    value === "FOLLOWERS_ONLY" ||
    value === "FRIENDS_ONLY" ||
    value === "ONLY_ME";

function formatRelativeTime(value: string): string {
    const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function buildCommentTree(comments: PostComment[]): CommentNode[] {
    const nodeMap = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];

    comments.forEach((comment) => {
        nodeMap.set(comment.id, { ...comment, children: [] });
    });

    nodeMap.forEach((node) => {
        if (node.parentCommentId && nodeMap.has(node.parentCommentId)) {
            nodeMap.get(node.parentCommentId)?.children.push(node);
            return;
        }
        roots.push(node);
    });

    const sortNodes = (nodes: CommentNode[]) => {
        nodes.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
        nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
}

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
    const [editMediaUrls, setEditMediaUrls] = useState<string[]>(post.mediaUrls);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [commentDraft, setCommentDraft] = useState("");
    const [commentMediaUrls, setCommentMediaUrls] = useState<string[]>([]);
    const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
    const [replyToComment, setReplyToComment] = useState<PostComment | null>(null);
    const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [isSubmittingCommentEdit, setIsSubmittingCommentEdit] = useState(false);
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [showReplyBar, setShowReplyBar] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [dialogMediaIndex, setDialogMediaIndex] = useState(0);
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const mediaClickTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const commentEmojiPickerRef = useRef<HTMLDivElement>(null);
    const commentMediaInputRef = useRef<HTMLInputElement>(null);

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
            return `/u/${authorUsername}`;
        }
        return null;
    }, [authorUsername]);

    const lightboxImages = useMemo<LightboxImage[]>(
        () =>
            post.mediaUrls
                .filter((url) => !/\.(mp4|webm)$/i.test(url))
                .map((url, index) => ({
                    id: `${post.id}-${index}`,
                    url,
                    name: `${post.authorDisplayName ?? "post"}-${index + 1}`,
                })),
        [post.id, post.mediaUrls, post.authorDisplayName],
    );

    const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

    const renderCommentNode = (comment: CommentNode, depth = 0) => {
        const commentInitial = comment.userDisplayName.slice(0, 1).toUpperCase();
        const commentMyReaction = comment.reactions?.find((r) => r.reactedByMe);
        const commentTotalReactions = comment.reactions?.reduce((acc, r) => acc + r.count, 0) ?? 0;
        const isEditingThis = editingCommentId === comment.id;

        return (
            <div key={comment.id} className={cn("flex items-start gap-2.5", depth > 0 && "ml-10")}> 
                <button
                    type="button"
                    className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0"
                    onClick={() => {
                        if (comment.userUsername) {
                            navigate(`/u/${comment.userUsername}`);
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
                    {isEditingThis ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentContent("");
                                    }}
                                    disabled={isSubmittingCommentEdit}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmitEditComment}
                                    disabled={isSubmittingCommentEdit}
                                >
                                    {isSubmittingCommentEdit ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                                <button
                                    type="button"
                                    className="text-sm font-medium text-foreground hover:underline"
                                    onClick={() => {
                                        if (comment.userUsername) {
                                            navigate(`/u/${comment.userUsername}`);
                                        }
                                    }}
                                >
                                    {comment.userDisplayName}
                                </button>
                                {comment.content && (
                                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                                        {comment.content}
                                    </p>
                                )}
                                {comment.mediaUrls.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {comment.mediaUrls.map((url) => (
                                            <img
                                                key={url}
                                                src={url}
                                                alt="Comment attachment"
                                                className="h-36 w-full rounded-lg object-cover"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{formatRelativeTime(comment.createdAt)}</span>
                                {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                    <span>(edited)</span>
                                )}
                            </div>

                            <div className="mt-2 flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                        "gap-1 text-[11px] font-normal h-auto py-1 px-1.5 whitespace-nowrap",
                                        commentMyReaction ? "text-pink-500" : "text-muted-foreground",
                                    )}
                                    onClick={() => {
                                        if (commentMyReaction?.type === "LIKE") {
                                            void handleRemoveCommentReaction(comment.id);
                                        } else {
                                            void handleReactToComment(comment.id, "LIKE");
                                        }
                                    }}
                                >
                                    <Heart
                                        className={cn(
                                            "h-3 w-3",
                                            commentMyReaction && "fill-pink-500",
                                        )}
                                    />
                                    {commentTotalReactions > 0 && commentTotalReactions}
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1 text-[11px] font-normal h-auto py-1 px-1.5 text-muted-foreground whitespace-nowrap"
                                    onClick={() => handleReplyComment(comment)}
                                >
                                    <CornerUpLeft className="h-3 w-3" />
                                    Reply
                                </Button>

                                {comment.userId === currentUserId && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-1 text-[11px] font-normal h-auto py-1 px-1.5 text-muted-foreground whitespace-nowrap"
                                        onClick={() => handleEditComment(comment)}
                                    >
                                        <PenLine className="h-3 w-3" />
                                        Edit
                                    </Button>
                                )}

                                {comment.userId === currentUserId && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-1 text-[11px] font-normal h-auto py-1 px-1.5 text-red-600 hover:text-red-700 whitespace-nowrap"
                                        onClick={() => handleDeleteComment(comment.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    {comment.children.length > 0 && expandedCommentIds.has(comment.id) && (
                        <div className="mt-3 space-y-3 border-l border-border/70 pl-3">
                            {comment.children.map((child) => renderCommentNode(child, depth + 1))}
                        </div>
                    )}

                    {comment.children.length > 0 && !expandedCommentIds.has(comment.id) && (
                        <button
                            type="button"
                            onClick={() => {
                                const newSet = new Set(expandedCommentIds);
                                newSet.add(comment.id);
                                setExpandedCommentIds(newSet);
                            }}
                            className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
                        >
                            View {comment.children.length} {comment.children.length === 1 ? "reply" : "replies"}
                        </button>
                    )}

                    {comment.children.length > 0 && expandedCommentIds.has(comment.id) && (
                        <button
                            type="button"
                            onClick={() => {
                                const newSet = new Set(expandedCommentIds);
                                newSet.delete(comment.id);
                                setExpandedCommentIds(newSet);
                            }}
                            className="mt-2 text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                            Hide replies
                        </button>
                    )}
                </div>
            </div>
        );
    };

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

    const handleShareUpdated = (updatedPost: Post) => {
        updatePost(post.id, { shareCount: updatedPost.shareCount });
    };

    const handleEdit = () => {
        setIsActionsOpen(false);
        setEditContent(post.content);
        setEditVisibility(post.visibility);
        setEditMediaUrls(post.mediaUrls);
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



    const handleCommentEmojiSelect = (emoji: { native: string }) => {
        setCommentDraft((current) => current + emoji.native);
        setShowCommentEmojiPicker(false);
    };

    const handleCommentMediaSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.currentTarget.files;
        if (!files) return;

        const newUrls: string[] = [...commentMediaUrls];
        for (const file of files) {
            try {
                const response = await fileService.upload(file);
                newUrls.push(response.url);
            } catch {
                toast.error(`Failed to upload ${file.name}.`);
            }
        }
        setCommentMediaUrls(newUrls);
        if (commentMediaInputRef.current) {
            commentMediaInputRef.current.value = "";
        }
    };

    const handleRemoveCommentMedia = (url: string) => {
        setCommentMediaUrls((prev) => prev.filter((u) => u !== url));
    };

    useEffect(() => {
        if (!isActionsOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        };

        const handleEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsActionsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isActionsOpen]);

    const handleSubmitComment = async () => {
        const content = commentDraft.trim();
        if (!content && commentMediaUrls.length === 0) {
            toast.error("Comment cannot be empty.");
            return;
        }

        setIsSubmittingComment(true);
        try {
            const res = await postService.addComment(post.id, {
                content,
                mediaUrls: commentMediaUrls,
                parentCommentId: replyToComment?.id ?? null,
            });
            if (res.code === 1000 && res.result) {
                setComments((prev) => [res.result, ...prev]);
                setCommentDraft("");
                setCommentMediaUrls([]);
                setReplyToComment(null);
                setShowReplyBar(true);
                updatePost(post.id, { commentCount: post.commentCount + 1 });
            }
        } catch {
            toast.error("Could not add comment.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleEditComment = (comment: PostComment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };

    const handleReplyComment = (comment: PostComment) => {
        setReplyToComment(comment);
        setShowReplyBar(true);
        setCommentDraft((current) => (current.startsWith(`@${comment.userDisplayName} `) ? current : `@${comment.userDisplayName} ${current}`));
    };

    const handleSubmitEditComment = async () => {
        if (!editingCommentId) return;

        const content = editingCommentContent.trim();
        if (!content) {
            toast.error("Comment cannot be empty.");
            return;
        }

        setIsSubmittingCommentEdit(true);
        try {
            const res = await postService.editComment(post.id, editingCommentId, content);
            if (res.code === 1000 && res.result) {
                setComments((prev) =>
                    prev.map((c) => (c.id === editingCommentId ? res.result : c)),
                );
                setEditingCommentId(null);
                setEditingCommentContent("");
                toast.success("Comment updated.");
            }
        } catch {
            toast.error("Could not update comment.");
        } finally {
            setIsSubmittingCommentEdit(false);
        }
    };

    const handleDeleteComment = (commentId: string) => {
        setDeleteCommentId(commentId);
    };

    const confirmDeleteComment = async () => {
        if (!deleteCommentId) return;

        try {
            const res = await postService.deleteComment(post.id, deleteCommentId);
            if (res.code === 1000) {
                setComments((prev) => prev.filter((c) => c.id !== deleteCommentId));
                updatePost(post.id, { commentCount: post.commentCount - 1 });
                toast.success("Comment deleted.");
            }
        } catch {
            toast.error("Could not delete comment.");
        } finally {
            setDeleteCommentId(null);
        }
    };

    const handleReactToComment = async (commentId: string, type: ReactionType) => {
        try {
            const res = await postService.reactToComment(post.id, commentId, type);
            if (res.code === 1000 && res.result) {
                setComments((prev) =>
                    prev.map((c) => {
                        if (c.id === commentId) {
                            return { ...res.result };
                        }
                        return c;
                    }),
                );
            }
        } catch {
            toast.error("Could not react to comment.");
        }
    };

    const handleRemoveCommentReaction = async (commentId: string) => {
        try {
            const res = await postService.removeCommentReaction(post.id, commentId);
            if (res.code === 1000 && res.result) {
                setComments((prev) =>
                    prev.map((c) => {
                        if (c.id === commentId) {
                            return { ...res.result };
                        }
                        return c;
                    }),
                );
            }
        } catch {
            toast.error("Could not remove reaction.");
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

    const clearMediaClickTimer = () => {
        if (mediaClickTimerRef.current) {
            window.clearTimeout(mediaClickTimerRef.current);
            mediaClickTimerRef.current = null;
        }
    };

    const openImageLightbox = (index: number) => {
        if (!lightboxImages.length) {
            return;
        }
        setLightboxIndex(index);
    };

    const handleMediaClick = (index: number) => {
        clearMediaClickTimer();
        mediaClickTimerRef.current = window.setTimeout(() => {
            openImageLightbox(index);
        }, 220);
    };

    const handleMediaDoubleClick = () => {
        clearMediaClickTimer();
        void handleLikeFromMedia();
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
        if (!editMediaUrls.some((url) => !/\.(mp4|webm)$/i.test(url))) {
            toast.error("Please keep at least one image.");
            return;
        }

        setIsSubmittingEdit(true);
        try {
            const res = await postService.update(post.id, {
                content,
                mediaUrls: editMediaUrls,
                visibility: editVisibility,
            });

            if (res.code === 1000 && res.result) {
                updatePost(post.id, {
                    content: res.result.content,
                    mediaUrls: res.result.mediaUrls,
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
        if (!showCommentEmojiPicker) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (commentEmojiPickerRef.current && !commentEmojiPickerRef.current.contains(event.target as Node)) {
                setShowCommentEmojiPicker(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [showCommentEmojiPicker]);

    useEffect(() => {
        return () => {
            clearMediaClickTimer();
        };
    }, []);

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
                            {formatRelativeTime(post.createdAt)}
                        </p>
                    </div>
                </button>
                <div ref={actionsMenuRef} className="relative">
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        className="rounded-lg text-muted-foreground"
                        onClick={() => setIsActionsOpen((prev) => !prev)}
                    >
                        <MoreHorizontal className="size-4" />
                    </Button>

                    {isActionsOpen && (
                        <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-border bg-background p-1 shadow-xl">
                            {currentUserId === post.authorId && (
                                <button
                                    type="button"
                                    onClick={handleEdit}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                >
                                    <PenLine className="h-4 w-4" />
                                    Edit
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsActionsOpen(false);
                                    void handleSave();
                                }}
                                disabled={isSavingPost}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Bookmark className="h-4 w-4" />
                                {post.savedByMe ? "Unsave" : "Save"}
                            </button>
                            {currentUserId === post.authorId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsActionsOpen(false);
                                        void handleDelete();
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
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

            {/* Media - Single clickable thumbnail */}
            {post.mediaUrls.length > 0 && (
                <div
                    className="relative bg-muted overflow-hidden aspect-video cursor-zoom-in flex items-center justify-center group"
                    onClick={() => {
                        const isVideo = /\.(mp4|webm)$/i.test(post.mediaUrls[currentMediaIndex]);
                        if (!isVideo && lightboxImages.length > 0) {
                            handleMediaClick(currentMediaIndex);
                        }
                    }}
                    onDoubleClick={() => handleMediaDoubleClick()}
                >
                    {post.mediaUrls[currentMediaIndex].match(/\.(mp4|webm)$/i) ? (
                        <video
                            src={post.mediaUrls[currentMediaIndex]}
                            className="w-full h-full object-contain"
                            muted
                        />
                    ) : (
                        <img
                            src={post.mediaUrls[currentMediaIndex]}
                            alt="Post media"
                            className="w-full h-full object-contain"
                        />
                    )}
                    {showHeartBurst && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <Heart className="h-16 w-16 fill-pink-500 text-pink-500 opacity-90 animate-pulse" />
                        </div>
                    )}
                    
                    {/* Navigation arrows */}
                    {post.mediaUrls.length > 1 && (
                        <>
                            {currentMediaIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentMediaIndex((prev) => Math.max(0, prev - 1));
                                    }}
                                    className="absolute left-2 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            {currentMediaIndex < post.mediaUrls.length - 1 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentMediaIndex((prev) => Math.min(post.mediaUrls.length - 1, prev + 1));
                                    }}
                                    className="absolute right-2 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                            
                            {/* Image counter */}
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {currentMediaIndex + 1}/{post.mediaUrls.length}
                            </div>
                        </>
                    )}
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
                    onClick={() => setIsShareOpen(true)}
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
                                {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <SelectItem key={value} value={value}>
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-3.5 w-3.5 text-indigo-500" />
                                            {label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <MediaUploadZone
                            value={editMediaUrls}
                            onChange={setEditMediaUrls}
                            disabled={isSubmittingEdit}
                        />
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
                        <Button
                            type="button"
                            onClick={handleSubmitEdit}
                            disabled={
                                isSubmittingEdit ||
                                !editMediaUrls.some((url) => !/\.(mp4|webm)$/i.test(url))
                            }
                        >
                            {isSubmittingEdit ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isCommentOpen}
                onOpenChange={(open) => {
                    setIsCommentOpen(open);
                    if (open) {
                        setDialogMediaIndex(0);
                    } else {
                        setReplyToComment(null);
                        setCommentDraft("");
                        setCommentMediaUrls([]);
                        setShowCommentEmojiPicker(false);
                        setShowReplyBar(true);
                        setExpandedCommentIds(new Set());
                    }
                }}
            >
                <DialogContent className="sm:max-w-5xl p-0 overflow-hidden max-h-[90vh]">
                    <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] h-[90vh]">
                        <div className="bg-black relative flex min-h-0 items-center justify-center overflow-hidden group">
                            {post.mediaUrls.length > 0 ? (
                                post.mediaUrls[dialogMediaIndex].match(/\.(mp4|webm)$/i) ? (
                                    <video
                                        src={post.mediaUrls[dialogMediaIndex]}
                                        className="max-h-full max-w-full object-contain cursor-zoom-in"
                                        controls
                                        onClick={() => handleMediaClick(dialogMediaIndex)}
                                        onDoubleClick={() => handleMediaDoubleClick()}
                                    />
                                ) : (
                                    <img
                                        src={post.mediaUrls[dialogMediaIndex]}
                                        alt="Post media"
                                        className="max-h-full max-w-full object-contain cursor-zoom-in"
                                        onClick={() => handleMediaClick(dialogMediaIndex)}
                                        onDoubleClick={() => handleMediaDoubleClick()}
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

                            {post.mediaUrls.length > 1 && (
                                <>
                                    {dialogMediaIndex > 0 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDialogMediaIndex((prev) => Math.max(0, prev - 1));
                                            }}
                                            className="absolute left-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                    )}
                                    {dialogMediaIndex < post.mediaUrls.length - 1 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDialogMediaIndex((prev) => Math.min(post.mediaUrls.length - 1, prev + 1));
                                            }}
                                            className="absolute right-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    )}
                                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {dialogMediaIndex + 1}/{post.mediaUrls.length}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex min-h-0 flex-col bg-card">
                            <DialogHeader className="px-4 py-3 border-b border-border">
                                <DialogTitle className="text-base">Comments</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Join the conversation on this post.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                                {isLoadingComments ? (
                                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                                ) : commentTree.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
                                ) : (
                                    commentTree.map((comment) => renderCommentNode(comment))
                                )}
                            </div>

                            <div className="sticky bottom-0 border-t border-border bg-card px-4 py-3 space-y-3">
                                {replyToComment && showReplyBar && (
                                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground gap-2">
                                        <span className="flex-1 min-w-0 truncate">
                                            Replying to <span className="font-medium">{replyToComment.userDisplayName}</span>
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs flex-shrink-0"
                                            onClick={() => setShowReplyBar(false)}
                                        >
                                            Hide
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs text-red-500 hover:text-red-600 flex-shrink-0"
                                            onClick={() => setReplyToComment(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}

                                {replyToComment && !showReplyBar && (
                                    <div className="flex items-center gap-2 px-3 py-2">
                                        <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                                            Replying to <span className="font-medium">{replyToComment.userDisplayName}</span>
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs flex-shrink-0"
                                            onClick={() => setShowReplyBar(true)}
                                        >
                                            Show
                                        </Button>
                                    </div>
                                )}

                                {commentMediaUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {commentMediaUrls.map((url) => (
                                            <div key={url} className="relative group">
                                                <img
                                                    src={url}
                                                    alt="Comment attachment"
                                                    className="h-16 w-16 rounded-lg object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCommentMedia(url)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Textarea
                                    value={commentDraft}
                                    onChange={(event) => setCommentDraft(event.target.value)}
                                    rows={2}
                                    placeholder="Add a comment..."
                                    className="resize-none"
                                />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {/* Emoji button */}
                                        <div ref={commentEmojiPickerRef} className="relative">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-muted-foreground"
                                                onClick={() => setShowCommentEmojiPicker((prev) => !prev)}
                                            >
                                                <Smile className="h-4 w-4" />
                                            </Button>
                                            {showCommentEmojiPicker && (
                                                <div className="absolute bottom-full left-0 z-50 mb-2 rounded-2xl border border-border bg-card p-2 shadow-xl">
                                                    <Picker
                                                        data={data}
                                                        onEmojiSelect={handleCommentEmojiSelect}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Image button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-muted-foreground"
                                            onClick={() => commentMediaInputRef.current?.click()}
                                        >
                                            <ImageIcon className="h-4 w-4" />
                                        </Button>
                                        <input
                                            ref={commentMediaInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleCommentMediaSelect}
                                            className="hidden"
                                        />

                                        {/* GIF button (placeholder) */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs rounded-lg text-muted-foreground"
                                            disabled
                                        >
                                            GIF
                                        </Button>
                                    </div>

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

            <SharePostDialog
                post={post}
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                onShared={handleShareUpdated}
            />

            {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
                <ImageLightbox
                    images={lightboxImages}
                    index={lightboxIndex}
                    onIndexChange={setLightboxIndex}
                />
            )}

            <Dialog open={deleteCommentId !== null} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Comment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteCommentId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => void confirmDeleteComment()}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
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
