import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import PublicLayout from "@/layouts/public";
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
            { index: true, element: <LandingPage /> },
            { path: "terms", element: <TermsPage /> },
            { path: "privacy", element: <PrivacyPage /> },
        ],
    },
];
