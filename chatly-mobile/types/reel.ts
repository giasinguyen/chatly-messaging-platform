import type { PostVisibility, PostReactionSummary } from './post';

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
  video: {
    uri: string;
    name?: string;
    type?: string;
  };
  caption?: string;
  visibility?: PostVisibility;
}
