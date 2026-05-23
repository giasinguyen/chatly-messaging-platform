export type StoryType = "TEXT" | "PHOTO" | "VIDEO";

export const StoryType: Record<StoryType, StoryType> = {
    TEXT: "TEXT",
    PHOTO: "PHOTO",
    VIDEO: "VIDEO",
};

export type StoryPrivacy =
    | "EVERYONE"
    | "FRIENDS_ONLY"
    | "CLOSE_FRIENDS"
    | "ONLY_ME";

export const StoryPrivacy: Record<StoryPrivacy, StoryPrivacy> = {
    EVERYONE: "EVERYONE",
    FRIENDS_ONLY: "FRIENDS_ONLY",
    CLOSE_FRIENDS: "CLOSE_FRIENDS",
    ONLY_ME: "ONLY_ME",
};

export interface StoryUser {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    username?: string;
}

export interface Story {
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
    viewCount?: number;
    viewedByMe?: boolean;
    createdAt: string;
    user?: StoryUser;
}

export interface StoryCreationRequest {
    type: StoryType;
    content?: string;
    mediaUrl?: string;
    musicUrl?: string;
    musicName?: string;
    bgIndex?: number;
    fontSize?: number;
    privacy: StoryPrivacy;
}

export interface StoryReactionResponse {
    id: string;
    storyId: string;
    userId: string;
    emoji: string;
    createdAt: string;
    user?: StoryUser;
}

export interface StoryReplyResponse {
    id: string;
    storyId: string;
    userId: string;
    content: string;
    createdAt: string;
    user?: StoryUser;
}
