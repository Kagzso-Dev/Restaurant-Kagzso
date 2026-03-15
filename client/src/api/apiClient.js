import axios from "axios";

// ─── API Configuration ────────────────────────────────────────────────────────
// Use the centralized VITE_API_URL, which should be the Cloudflare Tunnel URL.
const API_BASE = import.meta.env.VITE_API_URL || "";
const baseURL = API_BASE.trim().replace(/\/+$/, "");

console.log("%c🔌 API URL initialized from VITE_API_URL:", "color: #f59e0b; font-weight: bold;", baseURL);

// Create axios instance
const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor (JWT Token) — essential for cross-origin authentication
api.interceptors.request.use(
    (config) => {
        try {
            const user = JSON.parse(sessionStorage.getItem("user"));
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        } catch (error) {
            console.error("SessionStorage error:", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
export { baseURL };
