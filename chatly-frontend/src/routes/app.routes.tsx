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
const HomePage = lazy(() => import("@/pages/app/home"));
const CreatePage = lazy(() => import("@/pages/app/create"));
const ExplorePage = lazy(() => import("@/pages/app/explore"));
const PostDetailPage = lazy(() => import("@/pages/app/post/[postId]"));
const UsernamePage = lazy(() => import("@/pages/app/profile/[username]"));

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
            { index: true, element: <HomePage /> },
            { path: "home", element: <HomePage /> },
            { path: "chat", element: <ChatPage /> },
            { path: "chat/:id", element: <ChatPage /> },
            { path: "chatbot", element: <ChatbotPage /> },
            { path: "chatbot/:sessionId", element: <ChatbotPage /> },
            { path: "cloud", element: <CloudPage /> },
            { path: "contact", element: <ContactPage /> },
            { path: "create", element: <CreatePage /> },
            { path: "explore", element: <ExplorePage /> },
            { path: "post/:postId", element: <PostDetailPage /> },
            { path: ":username/edit", element: <ProfilePage /> },

            { path: "settings", element: <SettingsPage /> },
            { path: ":username", element: <UsernamePage /> },
        ],
    },
];
