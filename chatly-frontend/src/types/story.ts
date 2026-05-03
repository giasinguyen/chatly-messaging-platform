export enum StoryType {
    TEXT = "TEXT",
    PHOTO = "PHOTO",
    VIDEO = "VIDEO"
}

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
    privacy: string;
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
    privacy: string;
}
