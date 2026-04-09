import axiosClient from '@/lib/axiosClient';

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
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<{ result: FileUploadResponse }> {
    const { data } = await axiosClient.post<{ result: FileUploadResponse }>(
      '/files/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      },
    );
    return data;
  },

  async deleteFile(fileId: string): Promise<void> {
    await axiosClient.delete(`/files/${fileId}`);
  },
};
