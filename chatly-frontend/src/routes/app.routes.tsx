import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
import ChatLayout from "@/layouts/app";
import ChatPage from "@/pages/app/chat";
import CloudPage from "@/pages/app/cloud";
import RouteErrorPage from "@/pages/fallback/route-error";

const ChatbotPage = lazy(() => import("@/pages/app/chatbot"));
const ContactPage = lazy(() => import("@/pages/app/contact"));
const ProfilePage = lazy(() => import("@/pages/app/profile"));

const SettingsPage = lazy(() => import("@/pages/app/settings"));
const HomePage = lazy(() => import("@/pages/app/home"));
const CreatePage = lazy(() => import("@/pages/app/create"));
const ExplorePage = lazy(() => import("@/pages/app/explore"));
const SavedPage = lazy(() => import("@/pages/app/saved"));
const PostDetailPage = lazy(() => import("@/pages/app/post/[postId]"));
const UsernamePage = lazy(() => import("@/pages/app/profile/[username]"));

export const appRoutes: RouteObject[] = [
    {
        path: "/",
        errorElement: <RouteErrorPage />,
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
            { path: "saved", element: <SavedPage /> },
            { path: "post/:postId", element: <PostDetailPage /> },
            { path: "u/:username/edit", element: <ProfilePage /> },

            { path: "settings", element: <SettingsPage /> },
            { path: "u/:username", element: <UsernamePage /> },
        ],
    },
];
