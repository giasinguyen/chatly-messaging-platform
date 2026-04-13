export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  dob?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  lastSeen?: string;
  /** True when the viewer is blocked by this user — backend returns limited info only. */
  limited?: boolean;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  dob?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  sessionId?: string;
  user: UserResponse;
}

/** ipwho.is JSON shape (server stores full payload from GET https://ipwho.is/{ip}) */
export type IpWhoGeoSnapshot = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  connection?: { isp?: string; org?: string };
  timezone?: { id?: string; utc?: string };
  flag?: { emoji?: string };
};

export interface UserSessionInfo {
  id: string;
  platform: string;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  locationLabel?: string | null;
  geoSnapshot?: IpWhoGeoSnapshot | null;
  createdAt: string;
  lastSeenAt?: string | null;
  current: boolean;
  /** false = active (Revoke); true = logged out */
  revoked?: boolean;
  revokedAt?: string | null;
}

export interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
