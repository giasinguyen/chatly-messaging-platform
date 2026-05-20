import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { MusicTrack } from '@/types/music';

export const musicService = {
  search: async (genre: string): Promise<ApiResponse<MusicTrack[]>> => {
    const response = await axiosClient.get<ApiResponse<MusicTrack[]>>('/api/music/search', {
      params: { genre },
    });
    return response.data;
  },
};
