import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-red-600 mb-4">403 — Unauthorized</h1>
      <p className="text-gray-600 mb-6">You do not have permission to access this page.</p>
      <Link to="/login" className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary transition">
        Back to Login
      </Link>
    </div>
  );
}
