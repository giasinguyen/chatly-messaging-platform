export type PostVisibility = "PUBLIC" | "FRIENDS_ONLY" | "ONLY_ME";

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

export type ReportReason = "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "OTHER";

export interface PostReactionSummary {
    type: ReactionType;
    count: number;
    reactedByMe: boolean;
}

export interface Post {
    id: string;
    authorId: string;
    authorUsername?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    savedByMe?: boolean;
    content: string;
    mediaUrls: string[];
    visibility: PostVisibility;
    hashtags: string[];
    reactions: PostReactionSummary[];
    commentCount: number;
    shareCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePostRequest {
    content: string;
    mediaUrls?: string[];
    visibility?: PostVisibility;
}

export interface UpdatePostRequest {
    content?: string;
    mediaUrls?: string[];
    visibility?: PostVisibility;
}

export interface ReactToPostRequest {
    type: ReactionType;
}

export interface ReportPostRequest {
    reason: ReportReason;
    description?: string;
}

export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "RESOLVED";

export interface ReportResponse {
    id: string;
    postId: string;
    reporterId: string;
    reportedUserId: string;
    reason: ReportReason;
    description?: string;
    status: ReportStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface PostPage {
    content: Post[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}

export interface FeedResponse {
    items: Post[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface PostComment {
    id: string;
    userId: string;
    userUsername?: string;
    userDisplayName: string;
    userAvatarUrl?: string;
    content: string;
    parentCommentId?: string | null;
    mediaUrls: string[];
    createdAt: string;
    updatedAt?: string;
    reactions: PostReactionSummary[];
    isAiGenerated?: boolean;
    triggerType?: string | null;
}

export interface CreatePostCommentRequest {
    content?: string;
    mediaUrls?: string[];
    parentCommentId?: string | null;
}
