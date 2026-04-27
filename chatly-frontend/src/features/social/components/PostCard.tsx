import { useState } from "react";
import { MoreHorizontal, Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postService } from "@/services/post.service";
import { usePostStore } from "@/store/post.store";
import { useAuthStore } from "@/store/auth.store";
import type { Post, ReactionType } from "@/types/post";
import { cn } from "@/lib/utils";

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
}

export function PostCard({ post }: PostCardProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const { updatePost, removePost } = usePostStore();
    const [pickerOpen, setPickerOpen] = useState(false);

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

    return (
        <article className="rounded-3xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600">
                        {post.authorId.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{post.authorId}</p>
                        <p className="text-xs text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                {currentUserId === post.authorId && (
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        className="rounded-lg text-gray-400"
                        onClick={handleDelete}
                    >
                        <MoreHorizontal className="size-4" />
                    </Button>
                )}
            </div>

            {/* Content */}
            <p className="px-5 py-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
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
                        <div key={url} className="relative aspect-video bg-gray-100">
                            {url.match(/\.(mp4|webm)$/i) ? (
                                <video src={url} className="w-full h-full object-cover" muted controls />
                            ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
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
            <div className="flex items-center gap-1 px-4 py-3 border-t border-gray-50">
                {/* Reaction button with picker */}
                <div className="relative">
                    {pickerOpen && (
                        <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-2xl bg-white shadow-lg border border-gray-100 px-3 py-2 z-10">
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
                            myReaction ? "text-pink-500" : "text-gray-500",
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
                    className="gap-1.5 rounded-xl text-xs font-normal text-gray-500"
                >
                    <MessageCircle className="size-4" />
                    {post.commentCount > 0 && post.commentCount}
                </Button>

                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 rounded-xl text-xs font-normal text-gray-500"
                >
                    <Share2 className="size-4" />
                    {post.shareCount > 0 && post.shareCount}
                </Button>
            </div>
        </article>
    );
}
