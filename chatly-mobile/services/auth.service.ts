import axiosClient from '@/lib/axiosClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResponse, AuthResponse } from '@/types/auth';

export const authService = {
  register: async (payload: {
    username: string;
    displayName: string;
    email?: string;
    phone?: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await axiosClient.post<ApiResponse<AuthResponse>>(
      '/api/auth/register',
      payload,
    );
    return response.data;
  },

  login: async (payload: {
    identifier: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await axiosClient.post<ApiResponse<AuthResponse>>(
      '/api/auth/login',
      payload,
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await axiosClient.post<ApiResponse<null>>('/api/auth/forgot-password', {
      email: email.trim(),
    });
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<null>> => {
    const response = await axiosClient.post<ApiResponse<null>>(
      '/api/auth/change-password',
      payload,
    );
    return response.data;
  },

  logout: async () => {
    const token = await AsyncStorage.getItem('access_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');

    if (token) {
      try {
        await axiosClient.post('/api/auth/logout', { token, refreshToken });
      } catch (error) {
        console.error('Failed to call logout API', error);
      }
    }

    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  },

  introspect: async (token: string): Promise<ApiResponse<{ valid: boolean }>> => {
    const response = await axiosClient.post<ApiResponse<{ valid: boolean }>>(
      '/api/auth/introspect',
      { token },
    );
    return response.data;
  },

  confirmQrLogin: async (token: string): Promise<ApiResponse<null>> => {
    const response = await axiosClient.post<ApiResponse<null>>('/api/auth/qr/confirm', {
      token,
    });
    return response.data;
  },
};
