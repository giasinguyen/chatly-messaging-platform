import { apiClient } from './apiClient';
import { ApiResponse, LoginResponse } from './types';

export const authService = {
  login: async (payload: Record<string, string>): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', payload);
    return response.data;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      try {
        await apiClient.post('/api/auth/logout', { token, refreshToken });
      } catch (error: unknown) {
        console.error('Logout request failed', error);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};
