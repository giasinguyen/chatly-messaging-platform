import { createBrowserRouter } from "react-router-dom";
import { publicRoutes } from "./public.routes";
import { authRoutes } from "./auth.routes";
import { appRoutes } from "./app.routes";
import { adminRoutes } from "./admin.routes";
import NotFoundPage from "@/pages/fallback/not-found";

export const router = createBrowserRouter([
    ...publicRoutes,
    ...authRoutes,
    ...appRoutes,
    ...adminRoutes,
    { path: "*", element: <NotFoundPage /> },
]);
