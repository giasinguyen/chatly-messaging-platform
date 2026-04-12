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

export interface UserSessionInfo {
    id: string;
    platform: string;
    deviceLabel?: string | null;
    ipAddress?: string | null;
    locationLabel?: string | null;
    createdAt: string;
    lastSeenAt?: string | null;
    current: boolean;
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

