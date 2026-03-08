import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { router } from "@/routes";
import { ThemeInitializer } from "@/components/customize/ThemeInitializer";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";
import { useAuthStore } from "@/store/auth.store";
import { setupAxiosInterceptors } from "@/lib/axiosClient";
import { userService } from "@/services/user.service";

/**
 * SESSION BOOTSTRAP
 * Thành phần đảm bảo đồng bộ thông tin User từ backend khi ứng dụng khởi chạy
 * nếu đã có token (isAuthenticated = true).
 */
function SessionBootstrap() {
    const { isAuthenticated, updateUser } = useAuthStore();

    useEffect(() => {
        const syncSession = async () => {
            const token = localStorage.getItem("access_token");
            if (isAuthenticated && token) {
                try {
                    const response = await userService.getMe();
                    if (response.code === 1000) {
                        updateUser(response.result);
                    }
                } catch (error) {
                    console.error("Session sync failed:", error);
                    // Có thể cân nhắc logout nếu getMe lỗi nghiêm trọng
                }
            }
        };

        syncSession();
    }, [isAuthenticated, updateUser]);

    return null;
}

/**
 * APP INNER
 * Chứa logic khởi tạo Interceptor và Router.
 */
function AppInit() {
    // const isUnsupportedViewport = useIsUnsupportedViewport(); // Đã tắt chặn mobile
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const theme = useThemeStore((s) => s.theme);
    const resolvedTheme = getResolvedTheme(theme);

    useEffect(() => {
        // Thiết lập logic toàn cục cho Axios
        setupAxiosInterceptors({
            onTokenRefreshed: (payload) => {
                setAuth(payload);
                console.log("Global Auth: Token refreshed successfully.");
            },
            onLogout: () => {
                clearAuth();
                toast.error(
                    "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
                );
                console.log("Global Auth: Session expired.");
            },
        });
    }, [setAuth, clearAuth]);

    return (
        <>
            <SessionBootstrap />
            <RouterProvider router={router} />
            <Toaster
                duration={3000}
                closeButton
                position="top-center"
                theme={resolvedTheme as "light" | "dark" | "system"}
                richColors
            />
        </>
    );
}

export default function App() {
    return (
        <>
            <ThemeInitializer />
            <AppInit />
        </>
    );
}
