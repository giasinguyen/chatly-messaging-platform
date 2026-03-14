import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { router } from "@/routes";
import { ThemeInitializer } from "@/components/customize/ThemeInitializer";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";
import { useAuthStore } from "@/store/auth.store";
import { setupAxiosInterceptors } from "@/lib/axiosClient";
import { userService } from "@/services/user.service";
import { Monitor } from "lucide-react";

// ============================================================
// VIEWPORT GUARD – Block viewport nhỏ hơn 1024px
// ============================================================
const MOBILE_BLOCK_MEDIA_QUERY = "(max-width: 1023px)";

function useIsUnsupportedViewport() {
    const [isUnsupported, setIsUnsupported] = useState(false);

    useEffect(() => {
        const mq = globalThis.matchMedia(MOBILE_BLOCK_MEDIA_QUERY);
        setIsUnsupported(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsUnsupported(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return isUnsupported;
}

function MobileUnsupportedView() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Monitor className="h-10 w-10 text-brand" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Chatly chưa hỗ trợ thiết bị này</h1>
                <p className="text-muted-foreground text-sm max-w-xs">
                    Vui lòng truy cập trên màn hình <span className="font-semibold text-foreground">máy tính</span> hoặc
                    mở rộng cửa sổ trình duyệt để tiếp tục.
                </p>
            </div>
        </div>
    );
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
 * Chứa logic khởi tạo Interceptor và Router.
 */
function AppInit() {
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const theme = useThemeStore((s) => s.theme);
    const resolvedTheme = getResolvedTheme(theme);
    const isUnsupportedViewport = useIsUnsupportedViewport();

    useEffect(() => {
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

export default function App() {
    return (
        <>
            <ThemeInitializer />
            <AppInit />
        </>
    );
}
