import { CornerUpLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PostComment } from "@/types/post";

interface CommentNode extends PostComment {
    children: CommentNode[];
}

interface ReelCommentTreeProps {
    comments: PostComment[];
    onReply: (comment: PostComment) => void;
    onToggleLike: (comment: PostComment) => void;
}

export function ReelCommentTree({
    comments,
    onReply,
    onToggleLike,
}: ReelCommentTreeProps) {
    const tree = buildCommentTree(comments);

    return (
        <div className="flex flex-col gap-4">
            {tree.map((comment) => (
                <CommentNodeView
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    onReply={onReply}
                    onToggleLike={onToggleLike}
                />
            ))}
        </div>
    );
}

function CommentNodeView({
    comment,
    depth,
    onReply,
    onToggleLike,
}: {
    comment: CommentNode;
    depth: number;
    onReply: (comment: PostComment) => void;
    onToggleLike: (comment: PostComment) => void;
}) {
    const label = comment.userDisplayName ?? "Chatly user";
    const reactionCount = comment.reactions?.reduce((sum, reaction) => sum + reaction.count, 0) ?? 0;
    const isLiked = comment.reactions?.some((reaction) => reaction.reactedByMe) ?? false;

    return (
        <div className={cn("flex flex-col gap-2", depth > 0 && "ml-10 border-l border-border pl-4")}>
            <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.userAvatarUrl} className="object-cover" />
                    <AvatarFallback>{label.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-xs">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        {comment.content && (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">
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
                                        className="h-32 w-full rounded-lg object-cover"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 gap-1 px-1.5 text-xs", isLiked && "text-pink-500")}
                            onClick={() => onToggleLike(comment)}
                        >
                            <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-pink-500")} />
                            {reactionCount > 0 && reactionCount}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-1.5 text-xs text-muted-foreground"
                            onClick={() => onReply(comment)}
                        >
                            <CornerUpLeft className="h-3.5 w-3.5" />
                            Reply
                        </Button>
                    </div>
                </div>
            </div>

            {comment.children.map((child) => (
                <CommentNodeView
                    key={child.id}
                    comment={child}
                    depth={depth + 1}
                    onReply={onReply}
                    onToggleLike={onToggleLike}
                />
            ))}
        </div>
    );
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

    return roots.sort(sortNewestFirst);
}

function sortNewestFirst(left: PostComment, right: PostComment) {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}
