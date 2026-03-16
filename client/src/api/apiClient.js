import axios from "axios";

// ─── API Configuration ────────────────────────────────────────────────────────
// Use the centralized VITE_API_URL, which should be the Cloudflare Tunnel URL.
const API_BASE = import.meta.env.VITE_API_URL || "";
const baseURL = API_BASE.trim().replace(/\/+$/, "");

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

// Response interceptor — handle token expiry globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear session and redirect to login
            try { sessionStorage.removeItem("user"); } catch { /* ignore */ }
            if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
export { baseURL };
