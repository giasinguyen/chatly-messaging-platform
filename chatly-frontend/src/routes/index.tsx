import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy } from "react";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
// Public routes
const LandingPage = lazy(() => import("@/pages/public/landing"));
const AboutPage = lazy(() => import("@/pages/public/about"));
const AIPage = lazy(() => import("@/pages/public/ai"));
const CareersPage = lazy(() => import("@/pages/public/careers"));
const ImpactPage = lazy(() => import("@/pages/public/impact"));
const ProductPage = lazy(() => import("@/pages/public/product"));
// Auth routes
const LoginPage = lazy(() => import("@/pages/auth/login"));
const RegisterPage = lazy(() => import("@/pages/auth/register"));
const ForgetPage = lazy(() => import("@/pages/auth/forget"));
// App routes
const ChatPage = lazy(() => import("@/pages/app/chat"));
const CloudPage = lazy(() => import("@/pages/app/cloud"));
const ContactPage = lazy(() => import("@/pages/app/contact"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));
// Admin routes
const DashboardPage = lazy(() => import("@/pages/admin/dashboard"));

export const router = createBrowserRouter([
    /* 
    =========================
    PUBLIC ROUTES
    =========================
    */
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

    /* 
    =========================
    AUTH ROUTES
    =========================
    */
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
            { path: "forget", element: <ForgetPage /> },
        ],
    },

    /* 
    =========================
    APP ROUTES (Protected)
    =========================
    */
    {
        path: "/app",
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Outlet />
                </LazyWrapper>
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="chat" replace /> },
            { path: "chat", element: <ChatPage /> },
            { path: "cloud", element: <CloudPage /> },
            { path: "contact", element: <ContactPage /> },
            { path: "settings", element: <SettingsPage /> },
        ],
    },

    /* 
    =========================
    ADMIN ROUTES (Protected)
    =========================
    */
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
]);

