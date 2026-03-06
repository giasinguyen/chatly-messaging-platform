import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";

const LoginPage = lazy(() => import("@/pages/auth/login"));
const RegisterPage = lazy(() => import("@/pages/auth/register"));

export const authRoutes: RouteObject[] = [
    {
        path: "/auth",
        element: (
            <LazyWrapper>
                <Outlet />
            </LazyWrapper>
        ),
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
        ],
    },
    { path: "login", element: <Navigate to="/auth" replace /> },
    { path: "register", element: <Navigate to="/auth" replace /> },
];
