import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { LazyWrapper } from "@/components/customize/LazyWrapper";
import { ProtectedRoute } from "@/components/customize/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

const DashboardPage = lazy(() => import("@/pages/admin/dashboard"));
const UsersPage = lazy(() => import("@/pages/admin/users"));
const PostsPage = lazy(() => import("@/pages/admin/posts"));
const ReportsPage = lazy(() => import("@/pages/admin/reports"));
const UserReportsPage = lazy(() => import("@/pages/admin/reports/users"));
const EngagementPage = lazy(() => import("@/pages/admin/engagement"));
const CreatorsPage = lazy(() => import("@/pages/admin/creators"));
const HashtagsPage = lazy(() => import("@/pages/admin/hashtags"));
const TrendingPage = lazy(() => import("@/pages/admin/trending"));
const AiAgentPage = lazy(() => import("@/pages/admin/ai-agent"));
const SystemHealthPage = lazy(() => import("@/pages/admin/system"));
const AuditLogsPage = lazy(() => import("@/pages/admin/audit"));
const SettingsPage = lazy(() => import("@/pages/admin/settings"));

export const adminRoutes: RouteObject[] = [
    {
        path: "/admin",
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <AdminLayout>
                        <Outlet />
                    </AdminLayout>
                </LazyWrapper>
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <DashboardPage /> },
            { path: "users", element: <UsersPage /> },
            { path: "posts", element: <PostsPage /> },
            { path: "reports", element: <Navigate to="/admin/reports/posts" replace /> },
            { path: "reports/posts", element: <ReportsPage /> },
            { path: "reports/users", element: <UserReportsPage /> },
            { path: "engagement", element: <EngagementPage /> },
            { path: "creators", element: <CreatorsPage /> },
            { path: "hashtags", element: <HashtagsPage /> },
            { path: "trending", element: <TrendingPage /> },
            { path: "ai-agent", element: <AiAgentPage /> },
            { path: "system", element: <SystemHealthPage /> },
            { path: "audit", element: <AuditLogsPage /> },
            { path: "settings", element: <SettingsPage /> },
        ],
    },
];
export default adminRoutes;
