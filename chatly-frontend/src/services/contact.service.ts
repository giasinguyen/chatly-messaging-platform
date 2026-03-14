import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";

export const contactService = {
    getAll: async (): Promise<ApiResponse<ContactResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<ContactResponse[]>>(
            "/api/contacts",
        );
        return response.data;
    },

    sendRequest: async (contactId: string): Promise<ApiResponse<ContactResponse>> => {
        const response = await axiosClient.post<ApiResponse<ContactResponse>>(
            "/api/contacts",
            { contactId },
        );
        return response.data;
    },
};
