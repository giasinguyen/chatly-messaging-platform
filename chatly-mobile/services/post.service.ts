import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type {
    Post,
    PostPage,
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

    getByAuthor: async (authorId: string, page = 0, size = 10): Promise<ApiResponse<PostPage>> => {
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

    delete: async (postId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/posts/${postId}`);
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
