import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { FaBug } from "react-icons/fa";

const CLIENT_LINKS = [
  { label: "Home", path: "/client/dashboard" },
  { label: "New Booking", path: "/client/book" },
  { label: "My Bookings", path: "/client/bookings" },
  { label: "Job Status", path: "/client/job-status" },
  { label: "Payment", path: "/client/payment" },
  { label: "Feedback", path: "/client/feedback" },
];

export default function ClientLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* ── Top Navbar ─────────────────────────────────── */}
      <header className="bg-primary-dark text-white sticky top-0 z-50 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Brand */}
          <Link
            to="/client/dashboard"
            className="flex items-center gap-2 text-xl font-bold tracking-wide shrink-0"
          >
            <FaBug className="text-accent text-2xl" />
            PAPECON
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {CLIENT_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-danger text-white text-sm font-semibold rounded-full hover:opacity-90 transition shrink-0"
          >
            Logout
          </button>
        </div>

        {/* Mobile nav — horizontal scroll */}
        <div className="md:hidden border-t border-white/10 overflow-x-auto">
          <nav className="flex gap-1 px-4 py-2">
            {CLIENT_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-primary-dark text-white/60 text-sm py-4 px-6 text-center">
        &copy; {new Date().getFullYear()} PAPECON Pest Control Services. All
        rights reserved.
      </footer>
    </div>
  );
}
