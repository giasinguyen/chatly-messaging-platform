export type StoryPrivacy = "EVERYONE" | "FOLLOWERS_ONLY" | "CLOSE_FRIENDS" | "ONLY_ME";

export type StoryType = "IMAGE" | "VIDEO" | "TEXT";

export interface StoryUser {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export interface StoryResponse {
    id: string;
    userId: string;
    type: StoryType;
    content?: string;
    mediaUrl?: string;
    musicUrl?: string;
    musicName?: string;
    bgIndex?: number;
    fontSize?: number;
    privacy: StoryPrivacy;
    viewCount: number;
    viewedByMe: boolean;
    createdAt: string;
    user?: StoryUser;
}
