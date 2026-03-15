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
 * Chỉ cho phép người dùng đã đăng nhập.
 * Nếu chưa đăng nhập, sẽ đẩy về trang login (mặc định /auth).
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
