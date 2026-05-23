import { create } from "zustand";
import type { UserResponse, AuthResponse } from "@/types/auth";

/**
 * AUTH STORE (Zustand)
 * Manages the login state and global user information.
 * Restores initial state using the access_token stored in localStorage.
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
    setSessionReady: () => void;
    sessionReady: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    // Initialize isAuthenticated based on whether there's a token in localStorage
    isAuthenticated: !!localStorage.getItem("access_token"),
    loading: false,
    // Becomes true once SessionBootstrap has completed its first /me fetch
    sessionReady: !localStorage.getItem("access_token"),

    setAuth: (payload) => {
        // Store tokens in localStorage for axiosClient to use
        localStorage.setItem("access_token", payload.token);
        localStorage.setItem("refresh_token", payload.refreshToken);

        set({
            user: payload.user,
            isAuthenticated: true,
            sessionReady: true,
        });
    },

    clearAuth: () => {
        // Clears both the store and localStorage (tokens)
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

    setSessionReady: () => {
        set({ sessionReady: true });
    },
}));
