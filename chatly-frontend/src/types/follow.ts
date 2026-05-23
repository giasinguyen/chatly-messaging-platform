export interface Follow {
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: string;
}

export interface UserResponse {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatar?: string;
}

export interface FollowersPage {
    content: UserResponse[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}

export interface FollowingPage {
    content: UserResponse[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}

export interface UserSocialStats {
    followers: number;
    following: number;
    posts: number;
    metadata?: Record<string, unknown>;
}

export interface FollowRequest {
    userId: string;
}

export interface UnfollowRequest {
    userId: string;
}
