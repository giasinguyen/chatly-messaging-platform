import { useCallback, useState } from "react";
import { postService } from "@/services/post.service";
import type { Post, PostReactionSummary, ReactionType } from "@/types/post";

interface UsePostReactionOptions {
    post: Post;
    onPostUpdated: (updated: Post) => void;
}

interface UsePostReactionReturn {
    isLoading: boolean;
    currentReaction: ReactionType | null;
    handleReact: (type: ReactionType) => Promise<void>;
    handleRemoveReaction: () => Promise<void>;
}

export function usePostReaction({
    post,
    onPostUpdated,
}: UsePostReactionOptions): UsePostReactionReturn {
    const [isLoading, setIsLoading] = useState(false);

    const myReaction = post.reactions.find((r) => r.reactedByMe);
    const currentReaction: ReactionType | null = myReaction?.type ?? null;

    const applyOptimisticReaction = useCallback(
        (type: ReactionType | null): Post => {
            const filtered = post.reactions
                .map((r): PostReactionSummary => {
                    if (r.reactedByMe) {
                        const newCount = r.count - 1;
                        return { ...r, count: newCount, reactedByMe: false };
                    }
                    return r;
                })
                .filter((r) => r.count > 0);

            if (!type) return { ...post, reactions: filtered };

            const existing = filtered.find((r) => r.type === type);
            if (existing) {
                return {
                    ...post,
                    reactions: filtered.map((r) =>
                        r.type === type ? { ...r, count: r.count + 1, reactedByMe: true } : r,
                    ),
                };
            }

            return {
                ...post,
                reactions: [...filtered, { type, count: 1, reactedByMe: true }],
            };
        },
        [post],
    );

    const handleReact = useCallback(
        async (type: ReactionType) => {
            if (isLoading) return;

            const optimistic = applyOptimisticReaction(type);
            onPostUpdated(optimistic);
            setIsLoading(true);

            try {
                const res = await postService.react(post.id, { type });
                if (res.code === 1000 && res.result) {
                    onPostUpdated(res.result);
                }
            } catch {
                onPostUpdated(post);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, post, applyOptimisticReaction, onPostUpdated],
    );

    const handleRemoveReaction = useCallback(async () => {
        if (isLoading || !currentReaction) return;

        const optimistic = applyOptimisticReaction(null);
        onPostUpdated(optimistic);
        setIsLoading(true);

        try {
            const res = await postService.removeReaction(post.id);
            if (res.code === 1000 && res.result) {
                onPostUpdated(res.result);
            }
        } catch {
            onPostUpdated(post);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, currentReaction, post, applyOptimisticReaction, onPostUpdated]);

    return { isLoading, currentReaction, handleReact, handleRemoveReaction };
}
