import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/routes";
import { ThemeInitializer } from "@/components/customize/ThemeInitializer";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";

function App() {
    const theme = useThemeStore((s) => s.theme);

    return (
        <>
            <ThemeInitializer />
            <RouterProvider router={router} />
            <Toaster
                duration={3000}
                closeButton
                position="top-center"
                theme={getResolvedTheme(theme)}
                richColors
            />
        </>
    );
}

export default App;
