import { Copy, Play } from "lucide-react";
import type { Post } from "@/types/post";

interface ExploreCardProps {
    post: Post;
    onClick?: () => void;
}

export function ExploreCard({ post, onClick }: ExploreCardProps) {
    const hasMedia = post.mediaUrls.length > 0;
    const isAlbum = post.mediaUrls.length > 1;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative w-full cursor-pointer overflow-hidden rounded-3xl bg-card border border-border/40 text-left iv-shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-[#312e81]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a146b] focus-visible:ring-offset-2 flex flex-col mb-6"
        >
            {hasMedia ? (
                <div className="w-full aspect-[4/5] overflow-hidden bg-muted">
                    <img
                        src={post.mediaUrls[0]}
                        alt="Post media"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                </div>
            ) : (
                <div className="flex w-full flex-col justify-between p-6 text-sm leading-relaxed min-h-[160px] bg-linear-to-br from-card to-[#1a146b]/5 dark:to-[#312e81]/5">
                    <p className="line-clamp-6 text-zinc-700 dark:text-zinc-300 font-medium">
                        {post.content}
                    </p>
                    {post.hashtags.length > 0 && (
                        <p className="mt-4 text-xs font-semibold text-[#1a146b] dark:text-[#818cf8] truncate">
                            {post.hashtags.map((hashtag) => `#${hashtag}`).join(" ")}
                        </p>
                    )}
                </div>
            )}

            {/* Hover overlay for media posts */}
            {hasMedia && (
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-4">
                    {post.hashtags.length > 0 && (
                        <p className="truncate text-xs font-semibold text-white/90">
                            {post.hashtags.map((hashtag) => `#${hashtag}`).join(" ")}
                        </p>
                    )}
                </div>
            )}

            {isAlbum && (
                <div className="absolute top-4 right-4 rounded-full bg-black/40 p-1.5 backdrop-blur-md">
                    <Copy className="h-4 w-4 text-white" />
                </div>
            )}

            <Play className="hidden" />
        </button>
    );
}
