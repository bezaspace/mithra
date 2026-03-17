const localBackendHttpUrl =
  import.meta.env.VITE_BACKEND_HTTP_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  "http://localhost:8000";

export const backendHttpUrl = (
  import.meta.env.PROD ? window.location.origin : localBackendHttpUrl
).replace(/\/$/, "");

export const backendWsUrl =
  import.meta.env.VITE_BACKEND_WS_URL ??
  (import.meta.env.PROD
    ? "wss://raksha-backend-xptj.onrender.com/ws/live"
    : `${backendHttpUrl.replace(/^http/i, "ws")}/ws/live`);
