import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { GuestRoute } from "@/components/customize/GuestRoute";
import PublicLayout from "@/layouts/public";

const LoginPage = lazy(() => import("@/pages/auth/login"));
const RegisterPage = lazy(() => import("@/pages/auth/register"));

export const authRoutes: RouteObject[] = [
    {
        path: "/auth",
        element: (
            <GuestRoute>
                <LazyWrapper>
                    <PublicLayout />
                </LazyWrapper>
            </GuestRoute>
        ),
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
        ],
    },
    { path: "login", element: <Navigate to="/auth/login" replace /> },
    { path: "register", element: <Navigate to="/auth/register" replace /> },
];
