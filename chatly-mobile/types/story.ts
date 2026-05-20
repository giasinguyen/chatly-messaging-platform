export type StoryPrivacy = 'EVERYONE' | 'FOLLOWERS_ONLY' | 'CLOSE_FRIENDS' | 'ONLY_ME';

export type StoryType = 'TEXT' | 'PHOTO' | 'VIDEO';

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

export interface StoryGroup {
  user: StoryUser;
  stories: StoryResponse[];
}
