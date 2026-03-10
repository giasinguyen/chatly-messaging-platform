import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import PublicLayout from "@/layouts/PublicLayout";
import TermsPage from "@/pages/public/terms";
import PrivacyPage from "@/pages/public/privacy";

const LandingPage = lazy(() => import("@/pages/public/landing"));

export const publicRoutes: RouteObject[] = [
    {
        path: "/",
        element: (
            <LazyWrapper>
                <PublicLayout />
            </LazyWrapper>
        ),
        children: [
            { path: "welcome", element: <LandingPage /> },
            { path: "home", element: <Navigate to="/welcome" replace /> },
            { path: "terms", element: <TermsPage /> },
            { path: "privacy", element: <PrivacyPage /> },
        ],
    },
];
