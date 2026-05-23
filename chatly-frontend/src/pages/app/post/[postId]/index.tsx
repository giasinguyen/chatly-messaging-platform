import { useEffect, useState } from "react";
import { ArrowLeft, Home, Loader2, Search } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/social/components/PostCard";
import { postService } from "@/services/post.service";
import type { Post } from "@/types/post";

interface PostDetailLocationState {
    source?: "explore" | "home" | "saved";
    sourcePath?: string;
}

export default function PostDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { postId } = useParams();
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const sourceState = (location.state as PostDetailLocationState | null) ?? null;

    const hasExploreSource = sourceState?.sourcePath?.startsWith("/explore") === true;
    const backTarget = hasExploreSource ? sourceState?.sourcePath ?? "/explore" : "/home";

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
                    <Button type="button" variant="ghost" onClick={() => navigate(backTarget)}>
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
                    <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
                        <p className="text-base font-semibold text-foreground">
                            Post no longer exists
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            The post may have been deleted or you may not have permission to view it.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(backTarget)}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {hasExploreSource ? "Back to Explore" : "Back"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Retry
                            </Button>
                            <Button type="button" onClick={() => navigate("/home")}>
                                <Home className="mr-2 h-4 w-4" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
