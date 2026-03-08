import axios from "axios";

/**
 * Axios HTTP Client Instance
 *
 * Configurations:
 * @param baseURL - Base URL của backend API (lấy từ biến môi trường VITE_BACKEND_BASE_URL)
 * @param withCredentials - Cho phép gửi cookie trong request (phục vụ authentication session)
 * @param headers - Header mặc định cho mọi request
 * @param headers["Content-Type"] - Định dạng dữ liệu gửi lên server (JSON)
 * @param timeout - Thời gian tối đa chờ response từ server (milliseconds)
 */
const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
});

export default instance;

