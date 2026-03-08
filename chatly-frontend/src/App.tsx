import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { router } from "@/routes";
import { ThemeInitializer } from "@/components/customize/ThemeInitializer";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";
import { useAuthStore } from "@/store/auth.store";
import { setupAxiosInterceptors } from "@/lib/axiosClient";
import { userService } from "@/services/user.service";

/**
 * HOOK: KIỂM TRA VIEWPORT (Chống Mobile)
 * Ví dụ từ yêu cầu: Chặn các thiết bị có kích thước nhỏ hơn 1024px.
 */
const MOBILE_BLOCK_MEDIA_QUERY = "(max-width: 1023px)";

function useIsUnsupportedViewport() {
    const [isUnsupportedViewport, setIsUnsupportedViewport] =
        useState<boolean>(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_BLOCK_MEDIA_QUERY);
        const updateViewportState = (matches: boolean) => {
            setIsUnsupportedViewport(matches);
        };

        updateViewportState(mediaQuery.matches);
        const onViewportChange = (event: MediaQueryListEvent) => {
            updateViewportState(event.matches);
        };

        mediaQuery.addEventListener("change", onViewportChange);
        return () => mediaQuery.removeEventListener("change", onViewportChange);
    }, []);

    return isUnsupportedViewport;
}

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
 * MOBILE UNSUPPORTED VIEW
 * Hiển thị thông báo khi màn hình quá nhỏ.
 */
function MobileUnsupportedView() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-6 text-center dark:bg-black">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Desktop Only
            </h1>
            <p className="mt-2 text-gray-500">
                Chatly hiện tại chỉ hỗ trợ trải nghiệm trên máy tính để đạt hiệu
                suất tốt nhất. Vui lòng chuyển sang thiết bị có màn hình lớn
                hơn.
            </p>
        </div>
    );
}

/**
 * APP INNER
 * Chứa logic khởi tạo Interceptor và Router.
 */
function AppInner() {
    const isUnsupportedViewport = useIsUnsupportedViewport();
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

    if (isUnsupportedViewport) {
        return <MobileUnsupportedView />;
    }

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

/**
 * MAIN APP
 */
export default function App() {
    return (
        <>
            <ThemeInitializer />
            <AppInner />
        </>
    );
}
