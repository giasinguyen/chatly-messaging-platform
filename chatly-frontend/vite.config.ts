import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000, // cổng chạy dev server
        open: true, // tự động mở browser khi start
        strictPort: true, // báo lỗi nếu port đã bị chiếm
        hmr: {
            overlay: true, // hiển thị lỗi trực tiếp trên màn hình browser
        },
        proxy: {
            "/klipy-api": {
                target: "https://api.klipy.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/klipy-api/, ""),
            },
        },
    },
});
