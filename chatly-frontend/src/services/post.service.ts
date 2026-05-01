import axiosClient from "@/lib/axiosClient";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import type { ApiResponse } from "@/types/auth";
import type {
    Post,
    PostComment,
    PostPage,
    FeedResponse,
    CreatePostRequest,
    UpdatePostRequest,
    ReactToPostRequest,
} from "@/types/post";

export const postService = {
    create: async (payload: CreatePostRequest): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.post<ApiResponse<Post>>("/api/posts", payload);
        return response.data;
    },

    getFeed: async (page = 0, size = 10): Promise<ApiResponse<PostPage>> => {
        const response = await axiosClient.get<ApiResponse<PostPage>>("/api/posts/feed", {
            params: { page, size, sort: "createdAt,desc" },
        });
        return response.data;
    },

    getHomeFeed: async (
        cursor: string | null,
        size: number = HOME_FEED_PAGE_SIZE,
    ): Promise<ApiResponse<FeedResponse>> => {
        const params: Record<string, string | number> = { size };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await axiosClient.get<ApiResponse<FeedResponse>>(
            "/api/feed/home",
            { params },
        );
        return response.data;
    },

    getUserFeed: async (
        userId: string,
        cursor: string | null,
        size: number = HOME_FEED_PAGE_SIZE,
    ): Promise<ApiResponse<FeedResponse>> => {
        const params: Record<string, string | number> = { size };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await axiosClient.get<ApiResponse<FeedResponse>>(
            `/api/feed/user/${userId}`,
            { params },
        );
        return response.data;
    },

    getByAuthor: async (
        authorId: string,
        page = 0,
        size = 10,
    ): Promise<ApiResponse<PostPage>> => {
        const response = await axiosClient.get<ApiResponse<PostPage>>(
            `/api/posts/users/${authorId}`,
            { params: { page, size, sort: "createdAt,desc" } },
        );
        return response.data;
    },

    getById: async (postId: string): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.get<ApiResponse<Post>>(`/api/posts/${postId}`);
        return response.data;
    },

    update: async (postId: string, payload: UpdatePostRequest): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.patch<ApiResponse<Post>>(
            `/api/posts/${postId}`,
            payload,
        );
        return response.data;
    },

    delete: async (postId: string): Promise<void> => {
        await axiosClient.delete(`/api/posts/${postId}`);
    },

    savePost: async (postId: string): Promise<void> => {
        await axiosClient.put(`/api/posts/${postId}/save`);
    },

    unsavePost: async (postId: string): Promise<void> => {
        await axiosClient.delete(`/api/posts/${postId}/save`);
    },

    getComments: async (postId: string): Promise<ApiResponse<PostComment[]>> => {
        const response = await axiosClient.get<ApiResponse<PostComment[]>>(
            `/api/posts/${postId}/comments`,
        );
        return response.data;
    },

    addComment: async (
        postId: string,
        content: string,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.post<ApiResponse<PostComment>>(
            `/api/posts/${postId}/comments`,
            { content },
        );
        return response.data;
    },

    react: async (postId: string, payload: ReactToPostRequest): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.put<ApiResponse<Post>>(
            `/api/posts/${postId}/reactions`,
            payload,
        );
        return response.data;
    },

    removeReaction: async (postId: string): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.delete<ApiResponse<Post>>(
            `/api/posts/${postId}/reactions`,
        );
        return response.data;
    },
};
