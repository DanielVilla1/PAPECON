import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import ROLE_NAV from "../config/roleNav";

/**
 * Shared layout shell used by all role-specific layouts.
 * Props:
 *   role      — key into ROLE_NAV (e.g. "ceo", "operations")
 *   title     — sidebar heading (e.g. "PAPECON CEO")
 *   bgSidebar — Tailwind bg class for sidebar (default: "bg-primary")
 */
export default function RoleLayout({ role, title, bgSidebar = "bg-primary" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = ROLE_NAV[role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className={`w-64 ${bgSidebar} text-white flex flex-col`}>
        <div className="p-4 text-xl font-bold border-b border-white/20">
          {title}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded transition ${
                  isActive
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-danger rounded hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
