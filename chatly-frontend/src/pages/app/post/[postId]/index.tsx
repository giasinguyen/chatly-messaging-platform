import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/social/components/PostCard";
import { postService } from "@/services/post.service";
import type { Post } from "@/types/post";

export default function PostDetailPage() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        if (!postId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        postService
            .getById(postId)
            .then((response) => {
                if (!isActive) return;
                setPost(response.result ?? null);
            })
            .catch(() => {
                if (!isActive) return;
                setPost(null);
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [postId]);

    return (
        <div className="h-full w-full overflow-y-auto bg-background">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
                <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center rounded-3xl border border-border bg-card py-16 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading post...
                    </div>
                ) : post ? (
                    <PostCard
                        post={post}
                        onPostUpdate={(postId, updates) => {
                            setPost((current) =>
                                current && current.id === postId ? { ...current, ...updates } : current,
                            );
                        }}
                        onPostRemove={() => navigate("/home")}
                    />
                ) : (
                    <div className="rounded-3xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
                        Post not found.
                    </div>
                )}
            </div>
        </div>
    );
}
