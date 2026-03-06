import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";

const ChatPage = lazy(() => import("@/pages/app/chat"));
const CloudPage = lazy(() => import("@/pages/app/cloud"));
const ContactPage = lazy(() => import("@/pages/app/contact"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));

export const appRoutes: RouteObject[] = [
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
];

