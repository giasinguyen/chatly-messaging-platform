import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { ConversationResponse } from '@/types/conversation';
import type {
  GroupMemberResponse,
  AddMemberRequest,
  UpdateRoleRequest,
  GroupUpdateRequest,
  InviteLinkResponse,
  InviteLinkInfoResponse,
  PendingJoinResponse,
  GroupReminderRequest,
  GroupReminderResponse,
  GroupNoteRequest,
  GroupNoteResponse,
} from '@/types/group';

export const groupService = {
  addMember: async (
    conversationId: string,
    payload: AddMemberRequest,
  ): Promise<ApiResponse<GroupMemberResponse>> => {
    const response = await axiosClient.post<ApiResponse<GroupMemberResponse>>(
      `/api/groups/${conversationId}/members`,
      payload,
    );
    return response.data;
  },

  removeMember: async (
    conversationId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/groups/${conversationId}/members/${userId}`,
    );
    return response.data;
  },

  updateRole: async (
    conversationId: string,
    userId: string,
    payload: UpdateRoleRequest,
  ): Promise<ApiResponse<GroupMemberResponse>> => {
    const response = await axiosClient.put<ApiResponse<GroupMemberResponse>>(
      `/api/groups/${conversationId}/members/${userId}/role`,
      payload,
    );
    return response.data;
  },

  updateGroup: async (
    conversationId: string,
    payload: GroupUpdateRequest,
  ): Promise<ApiResponse<ConversationResponse>> => {
    const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
      `/api/groups/${conversationId}`,
      payload,
    );
    return response.data;
  },

  getMembers: async (
    conversationId: string,
  ): Promise<ApiResponse<GroupMemberResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<GroupMemberResponse[]>>(
      `/api/groups/${conversationId}/members`,
    );
    return response.data;
  },

  // ── Invite Link ──────────────────────────────────────────────────

  getOrCreateInviteLink: async (
    conversationId: string,
  ): Promise<ApiResponse<InviteLinkResponse>> => {
    const response = await axiosClient.post<ApiResponse<InviteLinkResponse>>(
      `/api/groups/${conversationId}/invite-link`,
    );
    return response.data;
  },

  resetInviteLink: async (
    conversationId: string,
  ): Promise<ApiResponse<InviteLinkResponse>> => {
    const response = await axiosClient.post<ApiResponse<InviteLinkResponse>>(
      `/api/groups/${conversationId}/invite-link/reset`,
    );
    return response.data;
  },

  joinByInviteLink: async (
    inviteToken: string,
  ): Promise<ApiResponse<GroupMemberResponse>> => {
    const response = await axiosClient.post<ApiResponse<GroupMemberResponse>>(
      `/api/groups/join/${inviteToken}`,
    );
    return response.data;
  },

  getInviteLinkInfo: async (
    inviteToken: string,
  ): Promise<ApiResponse<InviteLinkInfoResponse>> => {
    const response = await axiosClient.get<ApiResponse<InviteLinkInfoResponse>>(
      `/api/groups/invite/${inviteToken}/info`,
    );
    return response.data;
  },

  // ── Pending Requests ────────────────────────────────────────────

  getPendingRequests: async (
    conversationId: string,
  ): Promise<ApiResponse<PendingJoinResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<PendingJoinResponse[]>>(
      `/api/groups/${conversationId}/pending`,
    );
    return response.data;
  },

  approvePendingRequest: async (
    conversationId: string,
    userId: string,
  ): Promise<ApiResponse<GroupMemberResponse>> => {
    const response = await axiosClient.post<ApiResponse<GroupMemberResponse>>(
      `/api/groups/${conversationId}/pending/${userId}/approve`,
    );
    return response.data;
  },

  rejectPendingRequest: async (
    conversationId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/groups/${conversationId}/pending/${userId}`,
    );
    return response.data;
  },

  // ── Reminders ──────────────────────────────────────────────────

  getReminders: async (
    conversationId: string,
  ): Promise<ApiResponse<GroupReminderResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<GroupReminderResponse[]>>(
      `/api/groups/${conversationId}/reminders`,
    );
    return response.data;
  },

  createReminder: async (
    conversationId: string,
    payload: GroupReminderRequest,
  ): Promise<ApiResponse<GroupReminderResponse>> => {
    const response = await axiosClient.post<ApiResponse<GroupReminderResponse>>(
      `/api/groups/${conversationId}/reminders`,
      payload,
    );
    return response.data;
  },

  toggleReminder: async (
    reminderId: string,
  ): Promise<ApiResponse<GroupReminderResponse>> => {
    const response = await axiosClient.patch<ApiResponse<GroupReminderResponse>>(
      `/api/groups/reminders/${reminderId}/toggle`,
    );
    return response.data;
  },

  deleteReminder: async (
    reminderId: string,
  ): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/groups/reminders/${reminderId}`,
    );
    return response.data;
  },

  updateReminder: async (
    reminderId: string,
    payload: { title?: string; description?: string; remindAt?: string },
  ): Promise<ApiResponse<GroupReminderResponse>> => {
    const response = await axiosClient.put<ApiResponse<GroupReminderResponse>>(
      `/api/groups/reminders/${reminderId}`,
      payload,
    );
    return response.data;
  },

  // ── Notes ──────────────────────────────────────────────────────

  getNotes: async (
    conversationId: string,
  ): Promise<ApiResponse<GroupNoteResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<GroupNoteResponse[]>>(
      `/api/groups/${conversationId}/notes`,
    );
    return response.data;
  },

  createNote: async (
    conversationId: string,
    payload: GroupNoteRequest,
  ): Promise<ApiResponse<GroupNoteResponse>> => {
    const response = await axiosClient.post<ApiResponse<GroupNoteResponse>>(
      `/api/groups/${conversationId}/notes`,
      payload,
    );
    return response.data;
  },

  updateNote: async (
    noteId: string,
    payload: GroupNoteRequest,
  ): Promise<ApiResponse<GroupNoteResponse>> => {
    const response = await axiosClient.put<ApiResponse<GroupNoteResponse>>(
      `/api/groups/notes/${noteId}`,
      payload,
    );
    return response.data;
  },

  deleteNote: async (
    noteId: string,
  ): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/groups/notes/${noteId}`,
    );
    return response.data;
  },
};
