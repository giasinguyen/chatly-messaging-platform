export interface UserResponse {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: UserResponse;
}

export interface ApiResponse<T> {
    code: number;
    message?: string;
    result: T;
}

