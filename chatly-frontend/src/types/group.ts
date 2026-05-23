export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export interface GroupMemberResponse {
    conversationId: string;
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
    role: GroupRole;
    userRole?: "USER" | "ADMIN";
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
    requireApproval?: boolean;
    aiProactiveEnabled?: boolean;
}

export interface InviteLinkResponse {
    inviteToken: string;
    inviteLink: string;
}

export interface InviteLinkInfoResponse {
    conversationId: string;
    name: string;
    avatarUrl: string | null;
    memberCount: number;
    requireApproval: boolean;
    alreadyMember: boolean;
    hasPendingRequest: boolean;
}

export interface PendingJoinResponse {
    id: string;
    conversationId: string;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    userRole?: "USER" | "ADMIN";
    invitedBy: string | null;
    createdAt: string;
}

export interface GroupReminderRequest {
    title: string;
    description?: string;
    remindAt?: string;
}

export interface GroupReminderResponse {
    id: string;
    conversationId: string;
    creatorId: string;
    title: string;
    description: string | null;
    remindAt: string | null;
    completed: boolean;
    createdAt: string;
}

export interface GroupNoteRequest {
    title: string;
    content?: string;
    pinned?: boolean;
}

export interface GroupNoteResponse {
    id: string;
    conversationId: string;
    creatorId: string;
    title: string;
    content: string | null;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
}
