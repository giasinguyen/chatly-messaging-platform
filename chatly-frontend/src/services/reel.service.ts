import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type {
    CreatePostCommentRequest,
    PostComment,
    ReportPostRequest,
    ReportResponse,
    ReactToPostRequest,
} from "@/types/post";
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

    getByAuthor: async (
        authorId: string,
        cursor: string | null,
        size: number,
    ): Promise<ApiResponse<ReelFeedResponse>> => {
        const params: Record<string, string | number> = { size };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await axiosClient.get<ApiResponse<ReelFeedResponse>>(
            `/api/reels/users/${authorId}`,
            { params },
        );
        return response.data;
    },

    getById: async (reelId: string): Promise<ApiResponse<Reel>> => {
        const response = await axiosClient.get<ApiResponse<Reel>>(`/api/reels/${reelId}`);
        return response.data;
    },

    recordView: async (reelId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.post<ApiResponse<void>>(
            `/api/reels/${reelId}/view`,
        );
        return response.data;
    },

    react: async (
        reelId: string,
        payload: ReactToPostRequest,
    ): Promise<ApiResponse<Reel>> => {
        const response = await axiosClient.put<ApiResponse<Reel>>(
            `/api/reels/${reelId}/reactions`,
            payload,
        );
        return response.data;
    },

    removeReaction: async (reelId: string): Promise<ApiResponse<Reel>> => {
        const response = await axiosClient.delete<ApiResponse<Reel>>(
            `/api/reels/${reelId}/reactions`,
        );
        return response.data;
    },

    share: async (reelId: string): Promise<ApiResponse<Reel>> => {
        const response = await axiosClient.post<ApiResponse<Reel>>(
            `/api/reels/${reelId}/share`,
        );
        return response.data;
    },

    report: async (
        reelId: string,
        payload: ReportPostRequest,
    ): Promise<ApiResponse<ReportResponse>> => {
        const response = await axiosClient.post<ApiResponse<ReportResponse>>(
            "/api/reports",
            { postId: reelId, ...payload },
        );
        return response.data;
    },

    getComments: async (reelId: string): Promise<ApiResponse<PostComment[]>> => {
        const response = await axiosClient.get<ApiResponse<PostComment[]>>(
            `/api/reels/${reelId}/comments`,
        );
        return response.data;
    },

    addComment: async (
        reelId: string,
        payload: CreatePostCommentRequest,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.post<ApiResponse<PostComment>>(
            `/api/reels/${reelId}/comments`,
            payload,
        );
        return response.data;
    },

    reactToComment: async (
        reelId: string,
        commentId: string,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.put<ApiResponse<PostComment>>(
            `/api/reels/${reelId}/comments/${commentId}/reactions`,
            { type: "LIKE" },
        );
        return response.data;
    },

    removeCommentReaction: async (
        reelId: string,
        commentId: string,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.delete<ApiResponse<PostComment>>(
            `/api/reels/${reelId}/comments/${commentId}/reactions`,
        );
        return response.data;
    },
};
