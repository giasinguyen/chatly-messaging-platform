import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
import ChatLayout from "@/layouts/app";

const ChatPage = lazy(() => import("@/pages/app/chat"));
const ChatbotPage = lazy(() => import("@/pages/app/chatbot"));
const CloudPage = lazy(() => import("@/pages/app/cloud"));
const ContactPage = lazy(() => import("@/pages/app/contact"));
const ProfilePage = lazy(() => import("@/pages/app/profile"));
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
            { path: "chatbot", element: <ChatbotPage /> },
            { path: "chatbot/:sessionId", element: <ChatbotPage /> },
            { path: "cloud", element: <CloudPage /> },
            { path: "contact", element: <ContactPage /> },
            { path: "profile", element: <ProfilePage /> },
            { path: "settings", element: <SettingsPage /> },
        ],
    },
];
