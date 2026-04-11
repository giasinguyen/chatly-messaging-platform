import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, ApiResponse } from '@/types/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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

const performRefreshToken = async (): Promise<string> => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');

    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${API_BASE_URL}/api/auth/refresh`,
      { refreshToken },
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

// Request interceptor: attach token
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token && !config.url?.includes('/refresh')) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
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

    // Log diagnostic info for Network Errors or other failures
    console.error(`AXIOS ERROR: [${status || 'NETWORK'}] [${originalRequest?.method?.toUpperCase()}] [${originalRequest?.url}] - ${error.message}`);
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
      refreshPromise = performRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);

export default axiosClient;
