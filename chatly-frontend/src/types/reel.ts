import type { PostVisibility } from "@/types/post";
import type { PostReactionSummary } from "@/types/post";

export interface Reel {
    id: string;
    authorId: string;
    authorUsername?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    caption: string;
    videoUrl: string;
    visibility: PostVisibility;
    reactions: PostReactionSummary[];
    commentCount: number;
    shareCount: number;
    viewCount: number;
    createdAt: string;
    updatedAt?: string;
}

export interface ReelFeedResponse {
    items: Reel[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CreateReelRequest {
    video: File;
    caption?: string;
    visibility?: PostVisibility;
}
