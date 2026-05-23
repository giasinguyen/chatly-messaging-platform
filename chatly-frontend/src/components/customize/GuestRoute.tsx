import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

interface GuestRouteProps {
    children: ReactNode;
    to?: string;
}

/**
 * GuestRoute
 *
 * Only allows unauthenticated users.
 * If already authenticated, redirects to the home page (default /chat).
 */
export const GuestRoute = ({ children, to = "/chat" }: GuestRouteProps) => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to={to} replace />;
    }

    return <>{children}</>;
};
