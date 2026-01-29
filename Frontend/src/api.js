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
    if (status === 401) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {
        /* ignore */
      }
      // Redirect to login page to refresh session
      if (typeof window !== "undefined") {
        // Show a gentle message then navigate to login
        try {
          // avoid alert spam when multiple requests fail
          if (!window.__authRedirected) {
            window.__authRedirected = true;
            // small delay so UI can update
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
