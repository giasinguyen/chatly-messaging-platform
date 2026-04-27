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

export interface PostPage {
    content: Post[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}
