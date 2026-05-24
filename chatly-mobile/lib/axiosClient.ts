/**
 * Shared axios instance — same responsibility as `chatly-frontend/src/lib/axiosClient.ts`.
 *
 * `location_label` on login sessions is computed on the **server** from the client IP (GeoIP). Neither web nor
 * mobile sends city/GPS in the body; matching the web app here means consistent default headers:
 * `Content-Type`, `X-Client-Platform`, `X-Device-Label` (web uses `web` + navigator UA; we use `mobile` + device).
 *
 * Dev Tunnel: extra headers from `devTunnelHeaders.ts` mirror what browsers need to skip the tunnel interstitial.
 */
import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, ApiResponse } from '@/types/auth';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { getDevTunnelExtraHeaders } from '@/lib/devTunnelHeaders';
import { getMobileDeviceLabel } from '@/lib/deviceLabel';

const API_BASE_URL = getApiBaseUrl();

function buildCommonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
    'X-Device-Label': getMobileDeviceLabel(),
    ...getDevTunnelExtraHeaders(API_BASE_URL),
  };
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: buildCommonHeaders(),
  timeout: 10000,
});

// Store bridge callbacks
let onTokenRefreshed: ((payload: AuthResponse) => void) | null = null;
let onLogout: (() => void) | null = null;

export function setupAxiosInterceptors(opts: {
  onTokenRefreshed?: (payload: AuthResponse) => void;
  onLogout?: () => void;
}) {
  onTokenRefreshed = opts.onTokenRefreshed ?? null;
  onLogout = opts.onLogout ?? null;
}

// Shared refresh promise to prevent concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');

    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${API_BASE_URL}/api/auth/refresh`,
      { refreshToken },
      { headers: buildCommonHeaders() }
    );

    const payload = response.data.result;

    await AsyncStorage.setItem('access_token', payload.token);
    await AsyncStorage.setItem('refresh_token', payload.refreshToken);

    if (onTokenRefreshed) onTokenRefreshed(payload);

    return payload.token;
  } catch (error) {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    if (onLogout) onLogout();
    throw error;
  }
};

// Request interceptor: client headers + token
axiosClient.interceptors.request.use(
  async (config) => {
    const isFormData = config.data instanceof FormData;

    // Apply common headers but skip Content-Type for FormData uploads
    // so React Native auto-generates the multipart boundary.
    const common = buildCommonHeaders();
    for (const [key, value] of Object.entries(common)) {
      if (isFormData && key === 'Content-Type') continue;
      config.headers.set(key, value);
    }

    if (isFormData) {
      // Ensure multipart/form-data — RN's XHR layer will auto-append the boundary
      config.headers.set('Content-Type', 'multipart/form-data');
    }

    const token = await AsyncStorage.getItem('access_token');
    if (token && !config.url?.includes('/refresh')) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 with token refresh
axiosClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const isUnauthorized = status === 401 || status === 403;

    console.error(
      `AXIOS ERROR: [${status || 'NETWORK'}] [${originalRequest?.method?.toUpperCase()}] [${originalRequest?.url}] - ${error.message}`
    );
    if (!status && error.message === 'Network Error') {
      console.warn('Network Error detected. Check Dev Tunnel status and URL:', API_BASE_URL);
    }

    if (!isUnauthorized || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      Object.assign(originalRequest.headers, buildCommonHeaders());
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default axiosClient;
