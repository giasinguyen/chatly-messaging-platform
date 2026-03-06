import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";

const LandingPage = lazy(() => import("@/pages/public/landing"));
const AboutPage = lazy(() => import("@/pages/public/about"));
const AIPage = lazy(() => import("@/pages/public/ai"));
const CareersPage = lazy(() => import("@/pages/public/careers"));
const ImpactPage = lazy(() => import("@/pages/public/impact"));
const ProductPage = lazy(() => import("@/pages/public/product"));

export const publicRoutes: RouteObject[] = [
    {
        path: "/",
        element: (
            <LazyWrapper>
                <Outlet />
            </LazyWrapper>
        ),
        children: [
            { index: true, element: <LandingPage /> },
            { path: "about", element: <AboutPage /> },
            { path: "ai", element: <AIPage /> },
            { path: "careers", element: <CareersPage /> },
            { path: "impact", element: <ImpactPage /> },
            { path: "product", element: <ProductPage /> },
            { path: "home", element: <Navigate to="/" replace /> },
        ],
    },
];

