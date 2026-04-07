import axiosClient from "@/lib/axiosClient";

export interface FileUploadResponse {
    fileId: string;
    provider: string;
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    conversationId?: string;
}

export const fileService = {
    async upload(
        file: File,
        conversationId?: string,
        onProgress?: (percent: number) => void,
    ): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        if (conversationId) {
            formData.append("conversationId", conversationId);
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
};
