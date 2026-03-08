import { useEffect } from "react";
import { setupAxiosInterceptors } from "@/lib/axiosClient";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

/**
 * AUTH INITIALIZER
 * Thành phần này không hiển thị gì cả, nhiệm vụ duy nhất của nó là kết nối
 * Axios Interceptors với Zustand Store ngay khi ứng dụng khởi chạy.
 */
export const AuthInitializer = () => {
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);

    useEffect(() => {
        // Thiết lập các callback cho Axios Interceptors
        setupAxiosInterceptors({
            // Khi token được refresh thành công, cập nhật lại user info vào store
            onTokenRefreshed: (payload) => {
                setAuth(payload);
                console.log("Global Auth: Token refreshed and store updated.");
            },
            // Khi bị lỗi 401 (Unauthorized) mà không refresh được, thực hiện logout
            onLogout: () => {
                clearAuth();
                toast.error(
                    "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
                );
                console.log("Global Auth: Session expired, user logged out.");
            },
        });
    }, [setAuth, clearAuth]);

    return null; // Component này không render UI
};

