export interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  lastSeen?: string;
  suspended: boolean;
  createdAt: string;
  updatedAt?: string;
}

export enum ReportReason {
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
  VIOLENCE = "VIOLENCE",
  OTHER = "OTHER"
}

export enum ReportStatus {
  PENDING = "PENDING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED"
}

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

export interface UserGrowthData {
  date: string;
  count: number;
}

export interface SystemHealthStatus {
  service: string;
  statusRate: number;
  status: 'UP' | 'DEGRADED' | 'DOWN';
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
  totalConversations: number;
  totalMessages: number;
  userGrowth: UserGrowthData[];
  systemHealth: SystemHealthStatus[];
  recentActivity: AdminActivityLog[];
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}
