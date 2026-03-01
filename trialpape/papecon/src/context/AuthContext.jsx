import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

/**
 * Decode a JWT and return the payload, or null if invalid/expired.
 */
function decodeToken(token) {
  try {
    const decoded = jwtDecode(token);
    // Check expiry (exp is in seconds)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/** Read tokens from localStorage and decode synchronously on init */
function getInitialAuth() {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refresh_token");
  if (!token) return { token: null, refreshToken: null, user: null };
  const decoded = decodeToken(token);
  if (!decoded) {
    // Access token expired — but keep refresh token so silent refresh can work
    if (refreshToken) {
      return { token: null, refreshToken, user: null };
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    return { token: null, refreshToken: null, user: null };
  }
  return { token, refreshToken, user: decoded };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getInitialAuth);

  const login = (accessToken, refreshToken) => {
    localStorage.setItem("token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    const decoded = decodeToken(accessToken);
    setAuth({ token: accessToken, refreshToken, user: decoded });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setAuth({ token: null, refreshToken: null, user: null });
  };

  const { token, refreshToken, user } = auth;
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        role,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}

export default AuthContext;
