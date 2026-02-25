import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// ── Request interceptor ────────────────────────────────────────────────────
// Automatically attach the stored JWT to every outgoing request.
// This means individual callers (UploadBox, etc.) don't need to manually
// set the Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
// Catches every 401 response from the backend (expired or invalid token).
// Clears local state and forces the user back to /login.
api.interceptors.response.use(
  // Pass through all successful responses unchanged
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const isLoginPage = window.location.pathname === "/login";

    if (status === 401 && !isLoginPage) {
      // 1. Wipe all local auth state
      localStorage.removeItem("token");

      // 2. Hard redirect — bypasses React Router so any in-flight
      //    state or pending requests are fully torn down.
      //    A soft navigate (useNavigate) can't be called outside a component.
      window.location.href = "/login";
    }

    // Always re-reject so individual catch blocks can still run if needed
    return Promise.reject(error);
  }
);

export default api;