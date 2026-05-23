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
            className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-3xl bg-muted text-left shadow-sm transition-all duration-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
            {hasMedia ? (
                <img
                    src={post.mediaUrls[0]}
                    alt="Post media"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground line-clamp-5">
                    {post.content}
                </div>
            )}

            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />

            {isAlbum && (
                <div className="absolute top-4 right-4 rounded-full bg-black/40 p-1.5 backdrop-blur-md">
                    <Copy className="h-4 w-4 text-white" />
                </div>
            )}

            {post.hashtags.length > 0 && (
                <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">
                        {post.hashtags.map((hashtag) => `#${hashtag}`).join(" ")}
                    </p>
                </div>
            )}
            <Play className="hidden" />
        </button>
    );
}
