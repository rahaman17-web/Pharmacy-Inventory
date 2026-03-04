import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response handler: on 401, clear stored auth and redirect to login
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    // Skip logout for PIN/password verification endpoints — a wrong PIN is also a 401
    // but it should NOT kick the user out of their session
    const isVerifyEndpoint =
      url.includes("/verify-password") || url.includes("/set-pin");
    if (status === 401 && !isVerifyEndpoint) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {
        /* ignore */
      }
      // Redirect to login page to refresh session
      if (typeof window !== "undefined") {
        try {
          if (!window.__authRedirected) {
            window.__authRedirected = true;
            setTimeout(() => {
              window.location.href = "/login";
            }, 200);
          }
        } catch (e) {}
      }
    }
    return Promise.reject(error);
  }
);

export default api;
