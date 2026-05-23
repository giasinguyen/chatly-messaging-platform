import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';

export interface PrivacySettingsType {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  allowFriendRequests: boolean;
  showFriendList: boolean;
}

export interface UserSettingsType {
  id: string;
  userId: string;
  privacy: PrivacySettingsType;
}

export const settingsService = {
  getSettings: async (): Promise<ApiResponse<UserSettingsType>> => {
    const response = await axiosClient.get<ApiResponse<UserSettingsType>>('/api/users/me/settings');
    return response.data;
  },

  updatePrivacy: async (
    data: Partial<PrivacySettingsType>,
  ): Promise<ApiResponse<UserSettingsType>> => {
    const response = await axiosClient.patch<ApiResponse<UserSettingsType>>(
      '/api/users/me/settings/privacy',
      data,
    );
    return response.data;
  },
};
