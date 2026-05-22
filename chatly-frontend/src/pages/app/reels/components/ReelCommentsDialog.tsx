import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { reelService } from "@/services/reel.service";
import type { PostComment } from "@/types/post";
import type { Reel } from "@/types/reel";
import { ReelCommentComposer } from "./ReelCommentComposer";
import { ReelCommentTree } from "./ReelCommentTree";

interface ReelCommentsDialogProps {
    reel: Reel | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCommentAdded: (reelId: string) => void;
}

export function ReelCommentsDialog({
    reel,
    open,
    onOpenChange,
    onCommentAdded,
}: ReelCommentsDialogProps) {
    const [comments, setComments] = useState<PostComment[]>([]);
    const [draft, setDraft] = useState("");
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [replyToComment, setReplyToComment] = useState<PostComment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !reel) return;

        const loadComments = async () => {
            setIsLoading(true);
            try {
                const response = await reelService.getComments(reel.id);
                if (response.code === 1000 && response.result) {
                    setComments(response.result);
                }
            } catch {
                toast.error("Could not load comments.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadComments();
    }, [open, reel]);

    const handleSubmit = async () => {
        if (!reel || (!draft.trim() && mediaUrls.length === 0)) return;
        setIsSubmitting(true);
        try {
            const response = await reelService.addComment(reel.id, {
                content: draft.trim(),
                mediaUrls,
                parentCommentId: replyToComment?.id ?? null,
            });
            if (response.code === 1000 && response.result) {
                setComments((current) => [response.result, ...current]);
                setDraft("");
                setMediaUrls([]);
                setReplyToComment(null);
                onCommentAdded(reel.id);
            }
        } catch {
            toast.error("Could not add comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = (comment: PostComment) => {
        setReplyToComment(comment);
        const mention = `@${comment.userUsername ?? comment.userDisplayName} `;
        setDraft((current) => (current.startsWith(mention) ? current : mention + current));
    };

    const handleToggleCommentLike = async (comment: PostComment) => {
        if (!reel) return;
        try {
            const hasReacted = comment.reactions?.some((reaction) => reaction.reactedByMe);
            const response = hasReacted
                ? await reelService.removeCommentReaction(reel.id, comment.id)
                : await reelService.reactToComment(reel.id, comment.id);
            if (response.code === 1000 && response.result) {
                setComments((current) =>
                    current.map((item) => (item.id === comment.id ? response.result : item)),
                );
            }
        } catch {
            toast.error("Could not update comment reaction.");
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setDraft("");
            setMediaUrls([]);
            setReplyToComment(null);
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="left-auto right-0 top-0 flex h-dvh w-full max-w-[440px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l bg-background p-0 shadow-2xl sm:max-w-[440px]">
                <DialogHeader className="border-b border-border px-5 py-4">
                    <DialogTitle>Comments</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : comments.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            No comments yet.
                        </p>
                    ) : (
                        <ReelCommentTree
                            comments={comments}
                            onReply={handleReply}
                            onToggleLike={(comment) => void handleToggleCommentLike(comment)}
                        />
                    )}
                </div>

                <ReelCommentComposer
                    draft={draft}
                    mediaUrls={mediaUrls}
                    replyToComment={replyToComment}
                    isSubmitting={isSubmitting}
                    onDraftChange={setDraft}
                    onMediaUrlsChange={setMediaUrls}
                    onClearReply={() => setReplyToComment(null)}
                    onSubmit={() => void handleSubmit()}
                />
            </DialogContent>
        </Dialog>
    );
}
