import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '@/lib/axiosClient';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { getDevTunnelExtraHeaders } from '@/lib/devTunnelHeaders';
import { getMobileDeviceLabel } from '@/lib/deviceLabel';
import type { AgentFile } from '@/types/agent';

const BASE = '/api/ai/sessions';

/**
 * Build the same headers axiosClient sends so FileSystem.downloadAsync and expo-image
 * source requests are authenticated (dev tunnel + auth token).
 * Exported so components can pass these headers to expo-image `source.headers`.
 */
export async function buildFileRequestHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('access_token');
  const baseUrl = getApiBaseUrl();
  return {
    'X-Client-Platform': 'mobile',
    'X-Device-Label': getMobileDeviceLabel(),
    ...getDevTunnelExtraHeaders(baseUrl),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Sanitize a filename so it is safe to use as part of a file system path. */
function sanitizeForPath(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

  /** Returns a cached local URI for a file, downloading it if necessary. */
  getCachedUri: async (sessionId: string, fileId: string, filename: string): Promise<string> => {
    const safeName = sanitizeForPath(filename);
    const localUri = `${FileSystem.cacheDirectory}${fileId}_${safeName}`;

    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) return localUri;

    const url = `${getApiBaseUrl()}${BASE}/${sessionId}/files/${fileId}/content`;
    const headers = await buildFileRequestHeaders();
    const result = await FileSystem.downloadAsync(url, localUri, { headers });

    if (result.status !== 200) {
      // Remove partial/error file so next call retries
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      throw new Error(`Download failed with status ${result.status}`);
    }

    return result.uri;
  },

  /** Downloads a file to the cache directory and opens the share sheet. */
  shareFile: async (sessionId: string, fileId: string, filename: string): Promise<void> => {
    const uri = await agentFileService.getCachedUri(sessionId, fileId, filename);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { dialogTitle: filename });
    }
  },
};
