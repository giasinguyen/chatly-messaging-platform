import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import type { ReactNode } from "react";

interface AdminRouteProps {
    children: ReactNode;
}

/**
 * Route guard that allows only users with the ADMIN role.
 * Waits for SessionBootstrap to finish before checking role.
 * Redirects unauthenticated users to /login, non-admins to /.
 */
export function AdminRoute({ children }: AdminRouteProps) {
    const { user, isAuthenticated, sessionReady } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Session bootstrap hasn't finished loading user data yet — wait silently.
    if (!sessionReady) {
        return null;
    }

    if (user?.role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
