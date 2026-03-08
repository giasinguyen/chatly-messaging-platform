import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserResponse, AuthResponse } from "@/types/auth";

/**
 * AUTH STORE (Zustand)
 * Quản lý trạng thái đăng nhập và thông tin người dùng toàn cục.
 * Tự động đồng bộ (persist) vào localStorage để giữ trạng thái khi reload trang.
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

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            loading: false,

            setAuth: (payload) => {
                set({
                    user: payload.user,
                    isAuthenticated: true,
                });
            },

            clearAuth: () => {
                // Xóa cả trong store và trong localStorage (tokens)
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
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
        }),
        {
            name: "chatly-auth-storage", // Tên key lưu trong localStorage
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }), // Chỉ lưu user và auth status, không lưu loading
        },
    ),
);

