import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { AgoraTokenRequest, AgoraTokenResponse, CallSession } from '@/types/call';

export const callService = {
  getCallHistory: async (conversationId: string): Promise<ApiResponse<CallSession[]>> => {
    const response = await axiosClient.get<ApiResponse<CallSession[]>>('/api/calls/history', {
      params: { conversationId },
    });
    return response.data;
  },

  getCallDetails: async (callId: string): Promise<ApiResponse<CallSession>> => {
    const response = await axiosClient.get<ApiResponse<CallSession>>(`/api/calls/${callId}`);
    return response.data;
  },

  createAgoraToken: async (data: AgoraTokenRequest): Promise<ApiResponse<AgoraTokenResponse>> => {
    const response = await axiosClient.post<ApiResponse<AgoraTokenResponse>>(
      '/api/calls/agora-token',
      data
    );
    return response.data;
  },
};
