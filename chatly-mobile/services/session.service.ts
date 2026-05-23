import axiosClient from '@/lib/axiosClient';
import type { ApiResponse, UserSessionInfo } from '@/types/auth';

export const sessionService = {
  list: async (): Promise<ApiResponse<UserSessionInfo[]>> => {
    const res = await axiosClient.get<ApiResponse<UserSessionInfo[]>>('/api/auth/sessions');
    return res.data;
  },

  revoke: async (sessionId: string): Promise<ApiResponse<null>> => {
    const res = await axiosClient.delete<ApiResponse<null>>(`/api/auth/sessions/${sessionId}`);
    return res.data;
  },

  purgeAll: async (): Promise<ApiResponse<null>> => {
    const res = await axiosClient.post<ApiResponse<null>>('/api/auth/sessions/purge');
    return res.data;
  },
};
