import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "./Sidebar";

export default function AppLayout() {
    const { user } = useAuthStore();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
            <Sidebar user={user} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Outlet />
            </div>
        </div>
    );
}

