import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

export default function PublicLayout() {
    return (
        <div className="min-h-screen flex flex-col antialiased bg-[#EAEEFE] dark:bg-[#1a1c23] transition-colors duration-300">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

