import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: null,
  role: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
      try {
        const decoded = jwtDecode(token);
        set({ token, user: decoded, role: decoded.role || null });
      } catch {
        set({ token, user: null, role: null });
      }
    } else {
      localStorage.removeItem("token");
      set({ token: null, user: null, role: null });
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, role: null });
  },
}));

export default useAuthStore;
