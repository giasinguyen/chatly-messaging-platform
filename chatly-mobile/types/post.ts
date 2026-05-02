export type PostVisibility = "PUBLIC" | "FOLLOWERS_ONLY" | "FRIENDS_ONLY" | "ONLY_ME";

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

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
    visibility?: PostVisibility;
}

export interface ReactToPostRequest {
    type: ReactionType;
}

export interface PostComment {
    id: string;
    userId: string;
    userUsername?: string;
    userDisplayName?: string;
    userAvatarUrl?: string;
    content: string;
    mediaUrls: string[];
    reactions: PostReactionSummary[];
    parentCommentId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentRequest {
    content: string;
    mediaUrls?: string[];
    parentCommentId?: string;
}

export interface UpdateCommentRequest {
    content?: string;
}

export interface PostPage {
    content: Post[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}
