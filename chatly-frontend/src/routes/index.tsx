import LandingPage from "@/pages/public/landing";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
]);

