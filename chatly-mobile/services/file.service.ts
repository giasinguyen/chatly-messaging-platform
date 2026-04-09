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
<<<<<<< HEAD
  /**
   * Upload a file (image, video, etc.) to the server.
   * @param uri      local file URI from expo-image-picker / expo-document-picker
   * @param fileName original file name
   * @param mimeType MIME type, e.g. "image/jpeg"
   * @param conversationId optional, required for chat attachments
   */
  async upload(
    uri: string,
    fileName: string,
    mimeType: string,
    conversationId?: string,
  ): Promise<FileUploadResponse> {
    const formData = new FormData();

    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    const { data } = await axiosClient.post<{ result: FileUploadResponse }>(
      '/api/files/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return data.result;
  },

  async deleteFile(fileId: string): Promise<void> {
    await axiosClient.delete(`/api/files/${fileId}`);
=======
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
>>>>>>> van-minh
  },
};
