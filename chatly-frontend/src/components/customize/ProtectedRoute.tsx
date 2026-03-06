import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface ProtectedRouteProps {
    children: ReactNode;
    to?: string;
}

/**
 * ProtectedRoute
 *
 * This component protects routes that require authentication.
 * If the user is not logged in, they will be redirected
 * to the specified route (default: /auth).
 */
export const ProtectedRoute = ({
    children,
    to = "/auth", // Default redirect path when user is not authenticated
}: ProtectedRouteProps) => {
    /**
     * `isLogin` represents the authentication state of the user.
     *
     * In a real application, this value usually comes from:
     * - Redux store
     * - Zustand store
     * - Context
     * - Auth provider
     *
     * The value should remain `true` when the page is refreshed
     * as long as the session/token is still valid.
     */
    const isLogin = true;

    /**
     * If the user is not authenticated:
     * 1. Show an error notification
     * 2. Redirect the user to the login/auth page
     */
    if (!isLogin) {
        toast.error("Authentication required");

        return <Navigate to={to} />;
    }

    /**
     * If the user is authenticated,
     * render the protected content.
     */
    return <>{children}</>;
};
