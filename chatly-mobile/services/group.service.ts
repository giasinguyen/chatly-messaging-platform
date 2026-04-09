import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { ConversationResponse } from '@/types/conversation';
import type {
  GroupMemberResponse,
  AddMemberRequest,
  UpdateRoleRequest,
  GroupUpdateRequest,
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
};
