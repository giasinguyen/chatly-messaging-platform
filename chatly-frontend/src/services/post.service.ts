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
    CreatePostCommentRequest,
    ReportPostRequest,
    ReportResponse,
    ReactionType,
    TrendingHashtag,
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

    getSavedPosts: async (page = 0, size = 10): Promise<ApiResponse<PostPage>> => {
        const response = await axiosClient.get<ApiResponse<PostPage>>(
            "/api/posts/saved",
            { params: { page, size, sort: "createdAt,desc" } },
        );
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

    sharePost: async (postId: string): Promise<ApiResponse<Post>> => {
        const response = await axiosClient.post<ApiResponse<Post>>(
            `/api/posts/${postId}/share`,
        );
        return response.data;
    },

    reportPost: async (
        postId: string,
        payload: ReportPostRequest,
    ): Promise<ApiResponse<ReportResponse>> => {
        const response = await axiosClient.post<ApiResponse<ReportResponse>>(
            "/api/reports",
            { postId, ...payload },
        );
        return response.data;
    },

    getComments: async (postId: string): Promise<ApiResponse<PostComment[]>> => {
        const response = await axiosClient.get<ApiResponse<PostComment[]>>(
            `/api/posts/${postId}/comments`,
        );
        return response.data;
    },

    addComment: async (
        postId: string,
        payload: CreatePostCommentRequest,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.post<ApiResponse<PostComment>>(
            `/api/posts/${postId}/comments`,
            payload,
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

    editComment: async (
        postId: string,
        commentId: string,
        content: string,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.patch<ApiResponse<PostComment>>(
            `/api/posts/${postId}/comments/${commentId}`,
            { content },
        );
        return response.data;
    },

    deleteComment: async (postId: string, commentId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(
            `/api/posts/${postId}/comments/${commentId}`,
        );
        return response.data;
    },

    reactToComment: async (
        postId: string,
        commentId: string,
        type: ReactionType,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.put<ApiResponse<PostComment>>(
            `/api/posts/${postId}/comments/${commentId}/reactions`,
            { type },
        );
        return response.data;
    },

    removeCommentReaction: async (
        postId: string,
        commentId: string,
    ): Promise<ApiResponse<PostComment>> => {
        const response = await axiosClient.delete<ApiResponse<PostComment>>(
            `/api/posts/${postId}/comments/${commentId}/reactions`,
        );
        return response.data;
    },

    getExploreFeed: async (
        cursor: string | null,
        size: number = HOME_FEED_PAGE_SIZE,
    ): Promise<ApiResponse<FeedResponse>> => {
        const params: Record<string, string | number> = { size };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await axiosClient.get<ApiResponse<FeedResponse>>(
            "/api/feed/explore",
            { params },
        );
        return response.data;
    },

    searchPosts: async (
        q: string | null,
        hashtag: string | null,
        page = 0,
        size = 12,
    ): Promise<ApiResponse<PostPage>> => {
        const params: Record<string, string | number> = { page, size, sort: "createdAt,desc" };
        if (q) params.q = q;
        if (hashtag) params.hashtag = hashtag;
        const response = await axiosClient.get<ApiResponse<PostPage>>(
            "/api/posts/search",
            { params },
        );
        return response.data;
    },

    getTrendingHashtags: async (limit = 10): Promise<ApiResponse<TrendingHashtag[]>> => {
        const response = await axiosClient.get<ApiResponse<TrendingHashtag[]>>(
            "/api/posts/hashtags/trending",
            { params: { limit } },
        );
        return response.data;
    },
};
