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
 * Chỉ cho phép người dùng CHƯA đăng nhập.
 * Nếu đã đăng nhập, sẽ đẩy về trang chủ (mặc định /).
 */
export const GuestRoute = ({ children, to = "/chat" }: GuestRouteProps) => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to={to} replace />;
    }

    return <>{children}</>;
};
