import { Link } from "react-router-dom";
import {
  FaCalendarPlus,
  FaClipboardList,
  FaTasks,
  FaCreditCard,
  FaCommentDots,
  FaBug,
} from "react-icons/fa";

const QUICK_LINKS = [
  {
    icon: <FaCalendarPlus className="text-2xl text-accent" />,
    title: "New Booking",
    desc: "Schedule a pest control service.",
    path: "/client/book",
  },
  {
    icon: <FaClipboardList className="text-2xl text-accent" />,
    title: "My Bookings",
    desc: "View and manage your appointments.",
    path: "/client/bookings",
  },
  {
    icon: <FaTasks className="text-2xl text-accent" />,
    title: "Job Status",
    desc: "Track the progress of active jobs.",
    path: "/client/job-status",
  },
  {
    icon: <FaCreditCard className="text-2xl text-accent" />,
    title: "Payment",
    desc: "View invoices and make payments.",
    path: "/client/payment",
  },
  {
    icon: <FaCommentDots className="text-2xl text-accent" />,
    title: "Feedback",
    desc: "Rate a completed service.",
    path: "/client/feedback",
  },
];

export default function ClientDashboard() {
  return (
    <>
      {/* ── Hero banner ─────────────────────────────── */}
      <section className="relative bg-primary text-white overflow-hidden pb-12">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-5">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
              Welcome to Your
              <br />
              <span className="text-accent">Client Portal</span>
            </h1>
            <p className="text-white/70 text-lg max-w-lg leading-relaxed">
              Book services, track your jobs in real time, manage payments, and
              leave feedback — all in one place.
            </p>
            <Link
              to="/client/book"
              className="inline-flex items-center gap-2 px-7 py-3 bg-accent text-white font-semibold rounded-lg shadow-lg hover:bg-accent-light transition"
            >
              Book a Service
            </Link>
          </div>
          <div className="flex-1 hidden md:flex justify-center">
            <div className="w-56 h-56 lg:w-72 lg:h-72 rounded-full bg-accent/10 flex items-center justify-center">
              <FaBug className="text-accent/30 text-[7rem]" />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full leading-none">
          <svg viewBox="0 0 1440 200" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0,100 C360,200 1080,0 1440,100 L1440,200 L0,200 Z" fill="#F8F9FA" />
          </svg>
        </div>
      </section>

      {/* ── Quick Links ─────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-10">
            What would you like to do?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="bg-white rounded-xl shadow p-6 flex items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition"
              >
                <div className="p-3 bg-accent/10 rounded-lg">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-lg text-primary">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
