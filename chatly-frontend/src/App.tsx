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
import axios, { isAxiosError } from "axios";

/**
 * SESSION BOOTSTRAP
 * Component to sync user info from backend on app startup
 * if already has token (isAuthenticated = true).
 */
/** Error codes that mean the user no longer exists / session is dead */
const FATAL_BUSINESS_CODES = new Set([1100, 1006, 1001]);

/**
 * HTTP status codes from /me that definitively mean "this user no longer exists".
 * 404 = user deleted from DB (drop table / delete row)
 * 403 = account banned/deactivated by admin
 * 410 = resource permanently gone
 */
const FATAL_HTTP_STATUSES = new Set([403, 404, 410]);

function SessionBootstrap() {
    const { isAuthenticated, updateUser, clearAuth, setSessionReady } = useAuthStore();

    useEffect(() => {
        const syncSession = async () => {
            const token = localStorage.getItem("access_token");
            if (!isAuthenticated || !token) {
                setSessionReady();
                return;
            }

            try {
                const response = await userService.getMe();

                if (response.code === 1000) {
                    // ✅ Happy path: user exists, update store
                    updateUser(response.result);
                } else if (FATAL_BUSINESS_CODES.has(response.code)) {
                    // Backend returns HTTP 200 but context code indicates a critical error
                    console.warn("[SessionBootstrap] Fatal business code", response.code);
                    clearAuth();
                    toast.error("Account does not exist or has been deleted. Please log in again.");
                }
            } catch (error) {
                if (isAxiosError(error)) {
                    const status = error.response?.status;

                    if (status && FATAL_HTTP_STATUSES.has(status)) {
                        // Backend dropped DB or deleted user → /me returns 404 → token is invalid.
                        // Must clear tokens and redirect to login.
                        console.warn(
                            `[SessionBootstrap] /me returned HTTP ${status} – user no longer exists. Forcing logout.`,
                        );
                        clearAuth();
                        toast.error(
                            "Account does not exist or has been deleted. Please log in again.",
                        );
                        return;
                    }
                }
                // Other errors (network timeout, 500...) → do not logout, server might be restarting.
                console.error("[SessionBootstrap] Session sync failed (non-fatal):", error);
            } finally {
                setSessionReady();
            }
        };

        syncSession();
    }, [isAuthenticated, updateUser, clearAuth, setSessionReady]);

    return null;
}

/**
 * GLOBAL BOOT
 * Check Health and Introspect Token before loading Router
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
                         // If introspect fails (e.g., unauthorized, API error...)
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
        
        // Setup periodic introspect check every minute
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
                          toast.error("Session expired. Please log in again.");
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
                <p className="text-muted-foreground">Connecting to system...</p>
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
                    <h1 className="text-2xl font-bold text-foreground">System under maintenance</h1>
                    <p className="text-muted-foreground text-sm max-w-xs">
                        Chatly server is currently starting or temporarily inaccessible. Please try again in a few minutes.
                    </p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Contains Interceptor and Router initialization logic.
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
                    "Session expired. Please log in again.",
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
