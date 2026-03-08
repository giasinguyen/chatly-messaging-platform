import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import TermsPage from "@/pages/public/terms";
import PrivacyPage from "@/pages/public/privacy";

const LandingPage = lazy(() => import("@/pages/public/landing"));

export const publicRoutes: RouteObject[] = [
    {
        path: "/",
        element: (
            <LazyWrapper>
                <Outlet />
            </LazyWrapper>
        ),
        children: [
            { index: true, element: <Navigate to="/welcome" replace /> },
            { path: "welcome", element: <LandingPage /> },
            { path: "home", element: <Navigate to="/welcome" replace /> },
            { path: "terms", element: <TermsPage /> },
            { path: "privacy", element: <PrivacyPage /> },
        ],
    },
];
