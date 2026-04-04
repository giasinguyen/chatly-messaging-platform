import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { router } from "@/routes";
import { ThemeInitializer } from "@/components/customize/ThemeInitializer";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";
import { useAuthStore } from "@/store/auth.store";
import { setupAxiosInterceptors } from "@/lib/axiosClient";
import { userService } from "@/services/user.service";
import { AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";

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
 * GLOBAL BOOT
 * Kiểm tra HealthCheck và Introspect Token trước khi load Router
 */
function GlobalBoot({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<"checking" | "maintenance" | "ready">("checking");
    const { isAuthenticated, clearAuth } = useAuthStore();

    useEffect(() => {
        const boot = async () => {
            try {
                // 1. Check Backend Health
                await axios.get(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/health`, { timeout: 5000 });
                
                // 2. Check Introspect if authenticated
                const token = localStorage.getItem("access_token");
                if (isAuthenticated || token) {
                    try {
                        const res = await axios.post(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/introspect`, { token });
                        if (!res.data.result.valid) {
                            console.log("Token is invalid on boot. Clearing auth.");
                            clearAuth();
                            localStorage.removeItem("access_token");
                            localStorage.removeItem("refresh_token");
                        }
                    } catch (introspectErr) {
                         // Nếu introspect lỗi (ví dụ không authorized, API lỗi...)
                         console.error("Introspect failed:", introspectErr);
                    }
                }

                setStatus("ready");
            } catch (error) {
                console.error("Health check failed:", error);
                setStatus("maintenance");
            }
        };

        boot();
        
        // Cài đặt check định kỳ introspect mỗi phút
        const interval = setInterval(async () => {
             const token = localStorage.getItem("access_token");
             if (token) {
                 try {
                     const res = await axios.post(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/introspect`, { token });
                     if (!res.data.result.valid) {
                         console.log("Token invalid during interval check. Logging out.");
                         clearAuth();
                         localStorage.removeItem("access_token");
                         localStorage.removeItem("refresh_token");
                         toast.error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
                     }
                 } catch (err) {
                     // ignore
                 }
             }
        }, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [isAuthenticated, clearAuth]);

    if (status === "checking") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
                <p className="text-muted-foreground">Đang kết nối đến hệ thống...</p>
            </div>
        );
    }

    if (status === "maintenance") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
                <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Hệ thống đang bảo trì</h1>
                    <p className="text-muted-foreground text-sm max-w-xs">
                        Máy chủ Chatly hiện tại đang khởi động hoặc tạm thời không thể truy cập. Vui lòng thử lại sau ít phút.
                    </p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Chứa logic khởi tạo Interceptor và Router.
 */
function AppInit() {
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const theme = useThemeStore((s) => s.theme);
    const resolvedTheme = getResolvedTheme(theme);

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

    return (
        <GlobalBoot>
            <SessionBootstrap />
            <RouterProvider router={router} />
            <Toaster
                duration={3000}
                closeButton
                position="top-center"
                theme={resolvedTheme as "light" | "dark" | "system"}
                richColors
            />
        </GlobalBoot>
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
