import API from "./axiosInstance";

// ── Public auth ──────────────────────────────────────
export const login = (credentials) => API.post("/auth/login", credentials);
export const register = (data) => API.post("/auth/register", data);
export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${token}`);
export const resendVerification = (data) => API.post("/auth/resend-verification", data);
export const refreshToken = (refresh_token) => API.post("/auth/refresh", { refresh_token });
export const logoutAPI = () => API.post("/auth/logout");

// ── Authenticated ────────────────────────────────────
export const getMe = () => API.get("/auth/me");

// ── Admin: user moderation ───────────────────────────
export const getUsers = (status, role) =>
  API.get("/admin/users", { params: { ...(status && { status }), ...(role && { role }) } });
export const getUser = (id) => API.get(`/admin/users/${id}`);
export const approveUser = (id) => API.post(`/admin/users/${id}/approve`);
export const rejectUser = (id, reason) =>
  API.post(`/admin/users/${id}/reject`, { reason });
export const deactivateUser = (id) => API.post(`/admin/users/${id}/deactivate`);
export const activateUser = (id) => API.post(`/admin/users/${id}/activate`);
export const changeUserRole = (id, role) =>
  API.put(`/admin/users/${id}/role`, { role });
export const unlockUser = (id) => API.post(`/admin/users/${id}/unlock`);
