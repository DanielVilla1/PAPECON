import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import useAuth from "../../hooks/useAuth";
import { login as loginAPI } from "../../api/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  /** Map backend error codes to user-friendly messages */
  const friendlyError = (detail, status) => {
    if (status === 423) {
      return "Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.";
    }
    if (detail === "EMAIL_NOT_VERIFIED") {
      return "Your email has not been verified yet. Please check your inbox for a verification link.";
    }
    if (detail === "ACCOUNT_PENDING_APPROVAL") {
      return "Your email is verified but your account is still awaiting admin approval.";
    }
    if (status === 403 && detail?.includes("deactivated")) {
      return "Your account has been deactivated. Please contact support.";
    }
    return detail || "Login failed. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await loginAPI({ email, password });
      const { access_token, refresh_token } = res.data;
      login(access_token, refresh_token);
      // Decode token to decide where to redirect
      const decoded = jwtDecode(access_token);
      const role = decoded.role || "client";
      navigate(`/${role}/dashboard`);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      setError(friendlyError(detail, status));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-2">PAPECON</h1>
        <p className="text-center text-gray-500 mb-6">Pest Control Management System</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded mb-4 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
