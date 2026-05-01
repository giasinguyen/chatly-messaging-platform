export enum StoryType {
    TEXT = "TEXT",
    PHOTO = "PHOTO",
    VIDEO = "VIDEO"
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
    createdAt: string;
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
