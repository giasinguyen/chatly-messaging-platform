import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
import ChatLayout from "@/layouts/app";

const ChatPage = lazy(() => import("@/pages/app/chat"));
const CloudPage = lazy(() => import("@/pages/app/cloud"));
const ContactPage = lazy(() => import("@/pages/app/contact"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));

export const appRoutes: RouteObject[] = [
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <ChatLayout />
                </LazyWrapper>
            </ProtectedRoute>
        ),
        children: [
            { path: "chat", element: <ChatPage /> },
            { path: "chat/:id", element: <ChatPage /> },
            { path: "cloud", element: <CloudPage /> },
            { path: "contact", element: <ContactPage /> },
            { path: "settings", element: <SettingsPage /> },
        ],
    },
];
