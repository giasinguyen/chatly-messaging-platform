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
=======
import type { ContactResponse, ContactRequestPayload, ContactStatus } from "@/types/contact";

export const contactService = {
    getAll: async (): Promise<ApiResponse<ContactResponse[]>> => {
        const response = await axiosClient.get("/api/contacts");
        return response.data;
    },

    getByStatus: async (status: ContactStatus): Promise<ApiResponse<ContactResponse[]>> => {
        const response = await axiosClient.get(`/api/contacts/status/${status}`);
        return response.data;
    },

    sendRequest: async (payload: ContactRequestPayload): Promise<ApiResponse<ContactResponse>> => {
        const response = await axiosClient.post("/api/contacts", payload);
        return response.data;
    },

    accept: async (id: string): Promise<ApiResponse<ContactResponse>> => {
        const response = await axiosClient.put(`/api/contacts/${id}/accept`);
        return response.data;
    },

    block: async (id: string): Promise<ApiResponse<ContactResponse>> => {
        const response = await axiosClient.put(`/api/contacts/${id}/block`);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete(`/api/contacts/${id}`);
        return response.data;
    },
};
