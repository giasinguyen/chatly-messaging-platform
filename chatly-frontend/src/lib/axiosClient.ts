import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import type { AuthResponse, ApiResponse } from "@/types/auth";

/**
 * AXIOS CLIENT CONFIGURATION
 * Đây là instance axios dùng chung cho toàn bộ dự án.
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
// Các biến này dùng để cập nhật dữ liệu vào Store (Zustand/Redux) khi token thay đổi
// hoặc khi cần đá người dùng ra (logout) từ interceptor này.
// ============================================================
let onTokenRefreshed: ((payload: AuthResponse) => void) | null = null;
let onLogout: (() => void) | null = null;

export function setupAxiosInterceptors(opts: {
    onTokenRefreshed?: (payload: AuthResponse) => void;
    onLogout?: () => void;
}) {
    onTokenRefreshed = opts.onTokenRefreshed ?? null;
    onLogout = opts.onLogout ?? null;
}

// ============================================================
// REFRESH TOKEN LOGIC & SHARED PROMISE
// Biến refreshPromise đóng vai trò là một "cái khóa" (lock).
// Nếu có 10 request cùng bị lỗi 401, chỉ 1 request gọi API refresh,
// 9 request còn lại sẽ cùng đợi (await) kết quả của cái đó.
// ============================================================
let refreshPromise: Promise<string> | null = null;

const performRefreshToken = async (): Promise<string> => {
    try {
        const refreshToken = localStorage.getItem("refresh_token");

        // Gọi API /refresh để lấy Access Token mới
        const response = await axios.post<ApiResponse<AuthResponse>>(
            `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/refresh`,
            { refreshToken },
            { withCredentials: true },
        );

        const payload = response.data.result;

        // Lưu token mới vào local storage
        localStorage.setItem("access_token", payload.token);
        localStorage.setItem("refresh_token", payload.refreshToken);

        // Thông báo cho Store cập nhật user data mới (nếu có)
        if (onTokenRefreshed) onTokenRefreshed(payload);

        return payload.token;
    } catch (error) {
        // Nếu refresh cũng lỗi (hết hạn hoàn toàn) thì xóa sạch và logout
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (onLogout) {
            onLogout();
        }
        throw error;
    }
};

// ============================================================
// REQUEST INTERCEPTOR: Gắn Token vào Header
// Chạy TRƯỚC khi request được gửi đi.
// ============================================================
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");

        // Nếu có token và không phải đang gọi API refresh thì gắn vào Authorization
        if (token && !config.url?.includes("/refresh")) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ============================================================
// RESPONSE INTERCEPTOR: Xử lý lỗi 401 (Hết hạn Token)
// Chạy SAU khi nhận được response từ server.
// ============================================================
axiosClient.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // 1. Kiểm tra nếu lỗi là 401 (Unauthorized) hoặc 403 (Forbidden/Expired)
        const status = error.response?.status;
        const isUnauthorized = status === 401 || status === 403;

        // Nếu không phải 401 hoặc request này đã từng thử refresh rồi thì thôi
        if (!isUnauthorized || !originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }

        // 2. Chặn vòng lặp vô hạn (Tránh việc login/refresh bị lỗi 401 rồi lại gọi chính nó)
        if (
            originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/auth/refresh")
        ) {
            return Promise.reject(error);
        }

        // Đánh dấu request này đã đang trong quá trình "thử lại"
        originalRequest._retry = true;

        // 3. Thực hiện Refresh Token
        // Nếu chưa có request nào đang refresh thì bắt đầu gọi refresh API
        if (!refreshPromise) {
            refreshPromise = performRefreshToken().finally(() => {
                refreshPromise = null; // Hoàn thành thì mở khóa
            });
        }

        try {
            // Đợi lấy token mới (hoặc dùng chung kết quả từ request đang chạy)
            const newToken = await refreshPromise;

            // Gắn token mới vào request cũ và thực thi lại request đó
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            return axiosClient(originalRequest);
        } catch (e) {
            return Promise.reject(e);
        }
    },
);

export default axiosClient;
