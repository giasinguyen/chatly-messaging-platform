import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import type { AuthResponse, ApiResponse } from "@/types/auth";

/**
 * AXIOS CLIENT CONFIGURATION
 * This is the shared axios instance used throughout the project.
 */
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

// ============================================================
// STORE BRIDGE (Zustand/External components)
// These variables are used to update store data (Zustand/Redux) when tokens change
// or to force logout from this interceptor.
// ============================================================
let onTokenRefreshed: ((payload: AuthResponse) => void) | null = null;
let onLogout: (() => void) | null = null;

/**
 * Business error codes that indicate the current user/session is no longer valid.
 * Code 1100 = User not found (e.g. user was deleted from DB while token still alive)
 * Code 1006 = Account locked / deactivated
 * Code 1001 = Unauthenticated (should be caught by 401 but added as safety net)
 */
const FATAL_AUTH_CODES = new Set([1100, 1006, 1001]);

export function setupAxiosInterceptors(opts: {
    onTokenRefreshed?: (payload: AuthResponse) => void;
    onLogout?: () => void;
}) {
    onTokenRefreshed = opts.onTokenRefreshed ?? null;
    onLogout = opts.onLogout ?? null;
}

// ============================================================
// REFRESH TOKEN LOGIC & SHARED PROMISE
// The refreshPromise variable acts as a lock.
// If multiple requests fail with 401, only one calls the refresh API;
// the others wait (await) for its result.
// ============================================================
let refreshPromise: Promise<string> | null = null;

const performRefreshToken = async (): Promise<string> => {
    try {
        const refreshToken = localStorage.getItem("refresh_token");

        // Call /refresh API to get new Access Token
        const response = await axios.post<ApiResponse<AuthResponse>>(
            `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/refresh`,
            { refreshToken },
            { withCredentials: true },
        );

        const payload = response.data.result;

        // Save new tokens to local storage
        localStorage.setItem("access_token", payload.token);
        localStorage.setItem("refresh_token", payload.refreshToken);

        // Notify Store to update user data (if any)
        if (onTokenRefreshed) onTokenRefreshed(payload);

        return payload.token;
    } catch (error) {
        // If refresh also fails (completely expired), clear storage and logout
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (onLogout) {
            onLogout();
        }
        throw error;
    }
};

// REQUEST INTERCEPTOR: Attach Token to Header
// Runs BEFORE the request is sent.
// ============================================================
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");

        // Attach to Authorization header if token exists and not a refresh call
        if (token && !config.url?.includes("/refresh")) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// RESPONSE INTERCEPTOR: Handle 401 (Token Expired)
// Runs AFTER the response is received.
// ============================================================
axiosClient.interceptors.response.use(
    (res) => {
        // ============================================================
        // BUSINESS ERROR INTERCEPTOR
        // Server returns HTTP 200 but body code indicates user doesn't exist.
        // This happens when DB is dropped or user is deleted while token is still valid.
        // ============================================================
        const data = res.data as { code?: number } | undefined;
        if (data?.code !== undefined && FATAL_AUTH_CODES.has(data.code)) {
            // Ignore auth endpoints to avoid loops
            const url = res.config?.url ?? "";
            const isAuthEndpoint =
                url.includes("/auth/login") ||
                url.includes("/auth/register") ||
                url.includes("/auth/refresh") ||
                url.includes("/auth/introspect");

            if (!isAuthEndpoint) {
                console.warn(
                    `[axiosClient] Fatal business error code ${data.code} from ${url}. Forcing logout.`,
                );
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                if (onLogout) onLogout();
            }
        }
        return res;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        const status = error.response?.status;
        const url = originalRequest?.url ?? "";

        // ============================================================
        // DETECT "USER DELETED FROM DB" SCENARIO
        // When DB is dropped or user is deleted, /me returns 404 even if token is alive.
        // This is a sign the user no longer exists -> force logout.
        // Applies ONLY to /users/me, NOT standard 404s.
        // ============================================================
        const isMeEndpoint = url.includes("/users/me");
        const isUserGone = status === 404 || status === 410;

        if (isMeEndpoint && isUserGone) {
            console.warn(
                `[axiosClient] /me returned HTTP ${status} – user deleted from DB. Forcing logout.`,
            );
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            if (onLogout) onLogout();
            return Promise.reject(error);
        }

        // 1. Only retry on 401 (Unauthorized / expired)
        // 403 is forbidden (insufficient permissions), not auth failure -> do not retry
        const isUnauthorized = status === 401;

        // Reject if not 401 or already retried
        if (!isUnauthorized || !originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }


        // 2. Prevent infinite loops (avoid 401 on login/refresh calling themselves)
        if (
            originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/auth/refresh")
        ) {
            return Promise.reject(error);
        }

        // Mark request as retrying
        originalRequest._retry = true;

        // 3. Perform Refresh Token
        // Start refresh API call if not already in progress
        if (!refreshPromise) {
            refreshPromise = performRefreshToken().finally(() => {
                refreshPromise = null; // Unlock when finished
            });
        }

        try {
            // Wait for new token (or shared result from ongoing request)
            const newToken = await refreshPromise;

            // Attach new token and retry the original request
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            return axiosClient(originalRequest);
        } catch (e) {
            return Promise.reject(e);
        }
    },
);

export default axiosClient;
