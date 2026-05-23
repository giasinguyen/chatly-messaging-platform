import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

interface ProtectedRouteProps {
    children: ReactNode;
    to?: string;
}

/**
 * ProtectedRoute
 *
 * Only allows authenticated users.
 * If not authenticated, redirects to login page (default /auth).
 */
export const ProtectedRoute = ({
    children,
    to = "/auth",
}: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to={to} replace />;
    }

    return <>{children}</>;
};
