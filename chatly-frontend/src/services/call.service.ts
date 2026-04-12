import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { CallSession } from "@/types/call";

export const callService = {
    getCallHistory: async (conversationId: string): Promise<ApiResponse<CallSession[]>> => {
        const response = await axiosClient.get<ApiResponse<CallSession[]>>(
            "/api/calls/history",
            { params: { conversationId } },
        );
        return response.data;
    },

    getCallDetails: async (callId: string): Promise<ApiResponse<CallSession>> => {
        const response = await axiosClient.get<ApiResponse<CallSession>>(
            `/api/calls/${callId}`,
        );
        return response.data;
    },
};
