import axiosClient from "@/lib/axiosClient";
import type { ApiResponse, UserSessionInfo } from "@/types/auth";

export const sessionService = {
    list: async (): Promise<ApiResponse<UserSessionInfo[]>> => {
        const response = await axiosClient.get<ApiResponse<UserSessionInfo[]>>(
            "/api/auth/sessions",
        );
        return response.data;
    },

    revoke: async (sessionId: string): Promise<ApiResponse<null>> => {
        const response = await axiosClient.delete<ApiResponse<null>>(
            `/api/auth/sessions/${sessionId}`,
        );
        return response.data;
    },

    /** Removes every session row (history + all devices). Current tokens stop working — sign in again. */
    purgeAll: async (): Promise<ApiResponse<null>> => {
        const response = await axiosClient.post<ApiResponse<null>>("/api/auth/sessions/purge");
        return response.data;
    },
};
