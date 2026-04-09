export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export interface GroupMemberResponse {
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
    role: GroupRole;
    joinedAt: string;
}

export interface AddMemberRequest {
    userId: string;
}

export interface UpdateRoleRequest {
    role: GroupRole;
}

export interface GroupUpdateRequest {
    name?: string;
    avatar?: string;
    allowMembersUpdateInfo?: boolean;
}
