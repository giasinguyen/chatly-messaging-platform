import type { Post } from "@/types/post";

interface PostSharePreviewProps {
    post: Post;
}

export function PostSharePreview({ post }: PostSharePreviewProps) {
    return (
        <div className="rounded-2xl border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
                {post.mediaUrls[0] ? (
                    <img
                        src={post.mediaUrls[0]}
                        alt={post.content}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-background text-xs text-muted-foreground">
                        No image
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{post.authorDisplayName ?? "Post"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                </div>
            </div>
        </div>
    );
}