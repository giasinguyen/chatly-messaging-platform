export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserGrowthData {
  date: string;
  count: number;
}

export interface MessageActivityData {
  date: string;
  count: number;
}

export interface SystemHealthStatus {
  service: string;
  status: "UP" | "DOWN";
  description: string;
}

export interface AdminActivityLog {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface AdminStatsResponse {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalPosts: number;
  totalGroups: number;
  todayNewUsers: number;
  pendingReports: number;
  userGrowth: UserGrowthData[];
  messageActivity: MessageActivityData[];
  systemHealth: SystemHealthStatus[];
  recentActivity: AdminActivityLog[];
}

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE_CONTENT"
  | "VIOLENCE"
  | "OTHER";

export const ReportReason: Record<ReportReason, ReportReason> = {
  SPAM: "SPAM",
  HARASSMENT: "HARASSMENT",
  INAPPROPRIATE_CONTENT: "INAPPROPRIATE_CONTENT",
  VIOLENCE: "VIOLENCE",
  OTHER: "OTHER",
};

export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export const ReportStatus: Record<ReportStatus, ReportStatus> = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
};

export interface ReportResponse {
  id: string;
  postId: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSocialStatsResponse {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PostResponse {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  visibility: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationResponse {
  id: string;
  type: "PRIVATE" | "GROUP";
  name?: string;
  avatarUrl?: string;
  creatorId: string;
  participantIds: string[];
  createdAt: string;
  updatedAt?: string;
}
