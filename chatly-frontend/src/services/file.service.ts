import axiosClient from "@/lib/axiosClient";

export interface FileUploadResponse {
    fileId: string;
    provider: string;
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    conversationId?: string;
    uploadSource?: string;
    createdAt?: string;
}

export const fileService = {
    async upload(
        file: File,
        conversationId?: string,
        onProgress?: (percent: number) => void,
        uploadSource?: string,
    ): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        if (conversationId) {
            formData.append("conversationId", conversationId);
        }
        if (uploadSource) {
            formData.append("uploadSource", uploadSource);
        }

        const { data } = await axiosClient.post<{ result: FileUploadResponse }>(
            "/api/files/upload",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (event) => {
                    if (onProgress && event.total) {
                        onProgress(Math.round((event.loaded * 100) / event.total));
                    }
                },
            },
        );
        return data.result;
    },

    async deleteFile(fileId: string): Promise<void> {
        await axiosClient.delete(`/api/files/${fileId}`);
    },

    async getByConversation(
        conversationId: string,
        type?: "image" | "video" | "file",
        page?: number,
        size?: number,
    ): Promise<FileUploadResponse[]> {
        const params: Record<string, string | number> = {};
        if (type) params.type = type;
        if (page !== undefined) params.page = page;
        if (size !== undefined) params.size = size;
        const { data } = await axiosClient.get<{ result: FileUploadResponse[] }>(
            `/api/files/conversation/${conversationId}`,
            { params },
        );
        return data.result;
    },

    async getMyFiles(type?: "image" | "video" | "file"): Promise<FileUploadResponse[]> {
        const { data } = await axiosClient.get<{ result: FileUploadResponse[] }>(
            "/api/files/my",
            { params: type ? { type } : {} },
        );
        return data.result;
    },

    /**
     * Download a file through the backend proxy (avoids S3 CORS issues).
     * Returns the raw Blob.
     */
    async downloadFile(fileId: string): Promise<Blob> {
        const { data } = await axiosClient.get<Blob>(
            `/api/files/${fileId}/download`,
            { responseType: "blob" },
        );
        return data;
    },
};
