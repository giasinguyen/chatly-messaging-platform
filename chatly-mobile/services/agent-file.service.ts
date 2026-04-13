import axiosClient from '@/lib/axiosClient';
import type { AgentFile } from '@/types/agent';

const BASE = '/api/ai/sessions';

export const agentFileService = {
  upload: async (
    sessionId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (pct: number) => void,
  ): Promise<AgentFile> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const res = await axiosClient.post(`${BASE}/${sessionId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
};
