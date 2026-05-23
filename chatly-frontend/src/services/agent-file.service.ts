import axiosClient from "@/lib/axiosClient";
import type { AgentFile } from "@/types/agent";

const BASE = "/api/ai/sessions";

export const agentFileService = {
    upload: async (sessionId: string, file: File, onProgress?: (pct: number) => void): Promise<AgentFile> => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await axiosClient.post(`${BASE}/${sessionId}/files`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
                if (e.total && onProgress) {
                    onProgress(Math.round((e.loaded * 100) / e.total));
                }
            },
        });
        return res.data;
    },

    list: async (sessionId: string): Promise<AgentFile[]> => {
        const res = await axiosClient.get(`${BASE}/${sessionId}/files`);
        return res.data;
    },

    delete: async (sessionId: string, fileId: string): Promise<void> => {
        await axiosClient.delete(`${BASE}/${sessionId}/files/${fileId}`);
    },

    /** Return the content URL for a file (requires auth header — use downloadBlob for actual download). */
    getContentUrl: (sessionId: string, fileId: string): string => {
        const base = axiosClient.defaults.baseURL ?? "";
        return `${base}${BASE}/${sessionId}/files/${fileId}/content`;
    },

    /** Fetch file bytes and trigger a browser download. */
    downloadBlob: async (sessionId: string, fileId: string, filename: string): Promise<void> => {
        const res = await axiosClient.get(
            `${BASE}/${sessionId}/files/${fileId}/content`,
            { responseType: "blob" },
        );
        const url = URL.createObjectURL(res.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /** Fetch image bytes and return an object URL suitable for <img src>. Caller must revoke when done. */
    fetchObjectUrl: async (sessionId: string, fileId: string): Promise<string> => {
        const res = await axiosClient.get(
            `${BASE}/${sessionId}/files/${fileId}/content`,
            { responseType: "blob" },
        );
        return URL.createObjectURL(res.data as Blob);
    },
};
