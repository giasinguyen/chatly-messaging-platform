import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";

const DashboardPage = lazy(() => import("@/pages/admin/dashboard"));

export const adminRoutes: RouteObject[] = [
    {
        path: "/admin",
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Outlet />
                </LazyWrapper>
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <DashboardPage /> },
        ],
    },
];

