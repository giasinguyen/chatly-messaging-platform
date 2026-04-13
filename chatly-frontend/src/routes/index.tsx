import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { publicRoutes } from "./public.routes";
import { authRoutes } from "./auth.routes";
import { appRoutes } from "./app.routes";
import { adminRoutes } from "./admin.routes";
import NotFoundPage from "@/pages/fallback/not-found";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
import { LazyWrapper } from "@/components/customize/LazyWrapper";

const JoinByInvitePage = lazy(() => import("@/pages/app/join"));

export const router = createBrowserRouter([
    ...publicRoutes,
    ...authRoutes,
    ...appRoutes,
    ...adminRoutes,
    {
        path: "/join/:token",
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <JoinByInvitePage />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    { path: "*", element: <NotFoundPage /> },
]);
