import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types/post";

const GRID_PREVIEW_LIMIT = 80;

function formatGridCaption(post: Post): string {
    const text = post.content.trim().replace(/\s+/g, " ");
    if (!text) {
        return "";
    }
    return text.length > GRID_PREVIEW_LIMIT
        ? `${text.slice(0, GRID_PREVIEW_LIMIT - 1)}...`
        : text;
}

function getGridMediaUrl(post: Post): string | null {
    return post.mediaUrls[0] ?? null;
}

interface ProfilePostGridProps {
    posts: Post[];
    onNavigate: (id: string) => void;
}

export function ProfilePostGrid({ posts, onNavigate }: ProfilePostGridProps) {
    return (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
            {posts.map((post) => {
                const mediaUrl = getGridMediaUrl(post);
                const caption = formatGridCaption(post);
                const isImage = mediaUrl && !/\.(mp4|webm)$/i.test(mediaUrl);

                return (
                    <button
                        key={post.id}
                        type="button"
                        onClick={() => onNavigate(post.id)}
                        className="group relative aspect-square overflow-hidden rounded-none bg-muted"
                        title={caption || "Open post"}
                    >
                        {mediaUrl ? (
                            isImage ? (
                                <img
                                    src={mediaUrl}
                                    alt={caption || "Post"}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <video
                                    src={mediaUrl}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                />
                            )
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-pink-100 via-white to-indigo-100 text-center text-xs font-medium text-foreground/70 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800">
                                <span className="line-clamp-3 px-3">
                                    {caption || "Open post"}
                                </span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/25" />

                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/65 via-black/20 to-transparent px-2 py-2 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="flex items-center gap-3 text-xs font-semibold">
                                <span className="flex items-center gap-1">
                                    <Heart className="h-3.5 w-3.5 fill-white" />
                                    {post.reactions.reduce((acc, reaction) => acc + reaction.count, 0)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    {post.commentCount}
                                </span>
                            </div>
                            {post.mediaUrls.length > 1 && (
                                <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold">
                                    +{post.mediaUrls.length - 1}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
