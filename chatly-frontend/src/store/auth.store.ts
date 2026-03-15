import { create } from "zustand";
import type { UserResponse, AuthResponse } from "@/types/auth";

/**
 * AUTH STORE (Zustand)
 * Quản lý trạng thái đăng nhập và thông tin người dùng toàn cục.
 * Phục hồi trạng thái gốc bằng access_token lưu dưới localStorage.
 */
interface AuthState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    loading: boolean;

    // Actions
    setAuth: (payload: AuthResponse) => void;
    clearAuth: () => void;
    updateUser: (user: UserResponse) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    // Khởi tạo isAuthenticated dựa trên việc có token trong localStorage hay không
    isAuthenticated: !!localStorage.getItem("access_token"),
    loading: false,

    setAuth: (payload) => {
        // Lưu token vào localStorage để axiosClient có thể sử dụng
        localStorage.setItem("access_token", payload.token);
        localStorage.setItem("refresh_token", payload.refreshToken);

        set({
            user: payload.user,
            isAuthenticated: true,
        });
    },

    clearAuth: () => {
        // Xóa cả trong store và trong localStorage (tokens)
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        // Remove left-over zustand persistence key
        localStorage.removeItem("chatly-auth-storage");

        set({
            user: null,
            isAuthenticated: false,
        });
    },

    updateUser: (user) => {
        set({ user });
    },

    setLoading: (loading) => {
        set({ loading });
    },
}));
