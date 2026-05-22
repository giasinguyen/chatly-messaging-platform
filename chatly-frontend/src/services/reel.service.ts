import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { CreateReelRequest, Reel, ReelFeedResponse } from "@/types/reel";

export const reelService = {
    create: async (payload: CreateReelRequest): Promise<ApiResponse<Reel>> => {
        const formData = new FormData();
        formData.append("video", payload.video);
        if (payload.caption) {
            formData.append("caption", payload.caption);
        }
        if (payload.visibility) {
            formData.append("visibility", payload.visibility);
        }

        const response = await axiosClient.post<ApiResponse<Reel>>(
            "/api/reels",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
        );
        return response.data;
    },

    getFeed: async (
        cursor: string | null,
        size: number,
    ): Promise<ApiResponse<ReelFeedResponse>> => {
        const params: Record<string, string | number> = { size };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await axiosClient.get<ApiResponse<ReelFeedResponse>>(
            "/api/reels/feed",
            { params },
        );
        return response.data;
    },

    recordView: async (reelId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.post<ApiResponse<void>>(
            `/api/reels/${reelId}/view`,
        );
        return response.data;
    },
};
