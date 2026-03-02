import { Link } from "react-router-dom";
import {
  FaBug,
  FaShieldAlt,
  FaCalendarCheck,
  FaPhoneAlt,
  FaLeaf,
  FaClipboardCheck,
  FaStar,
  FaArrowRight,
} from "react-icons/fa";

const SERVICES = [
  {
    icon: <FaBug className="text-3xl text-accent" />,
    title: "General Pest Control",
    desc: "Comprehensive solutions for cockroaches, ants, rodents, and other common household pests.",
  },
  {
    icon: <FaShieldAlt className="text-3xl text-accent" />,
    title: "Termite Treatment",
    desc: "Advanced termite detection and elimination to protect your property's structural integrity.",
  },
  {
    icon: <FaLeaf className="text-3xl text-accent" />,
    title: "Eco-Friendly Solutions",
    desc: "Safe, environmentally responsible pest management that's gentle on your family and pets.",
  },
  {
    icon: <FaClipboardCheck className="text-3xl text-accent" />,
    title: "Commercial Services",
    desc: "Customized pest management programs for offices, restaurants, and industrial facilities.",
  },
];

const WHY_US = [
  { icon: <FaStar className="text-accent text-xl" />, text: "Licensed & certified technicians" },
  { icon: <FaStar className="text-accent text-xl" />, text: "Eco-friendly & pet-safe products" },
  { icon: <FaStar className="text-accent text-xl" />, text: "Real-time job tracking & updates" },
  { icon: <FaStar className="text-accent text-xl" />, text: "Satisfaction guarantee on every service" },
  { icon: <FaStar className="text-accent text-xl" />, text: "Flexible scheduling & online booking" },
  { icon: <FaStar className="text-accent text-xl" />, text: "Transparent pricing — no hidden fees" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* ── Navbar ──────────────────────────────────────── */}
      <header className="bg-primary-dark text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-wide">
            <FaBug className="text-accent text-2xl" />
            PAPECON
          </Link>

          {/* Nav links + buttons */}
          <nav className="flex items-center gap-6">
            <a href="#services" className="hidden md:inline text-sm font-medium hover:text-accent transition">
              Services
            </a>
            <a href="#why-us" className="hidden md:inline text-sm font-medium hover:text-accent transition">
              Why Us
            </a>
            <a href="#contact" className="hidden md:inline text-sm font-medium hover:text-accent transition">
              Contact
            </a>
            <Link
              to="/register"
              className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition"
            >
              Book a Service
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-light transition"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 border border-white text-white text-sm font-semibold rounded-full hover:bg-white/10 transition"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-28 md:py-36 flex flex-col md:flex-row items-center gap-12">
          {/* Left copy */}
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              Professional Pest Control
              <br />
              <span className="text-accent">You Can Trust</span>
            </h1>
            <p className="text-white/70 text-lg max-w-lg leading-relaxed">
              Protect your home and business from unwanted pests. PAPECON
              delivers safe, effective, and eco-friendly pest management
              solutions — backed by certified technicians and real-time job
              tracking.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3 bg-accent text-white font-semibold rounded-lg shadow-lg hover:bg-accent-light transition"
              >
                Book a Service
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-7 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/20 transition"
              >
                Our Services
              </a>
            </div>
          </div>

          {/* Right decorative area */}
          <div className="flex-1 hidden md:flex justify-center">
            <div className="w-72 h-72 lg:w-96 lg:h-96 rounded-full bg-accent/10 flex items-center justify-center">
              <FaShieldAlt className="text-accent/30 text-[10rem]" />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full leading-none">
          <svg viewBox="0 0 1440 120" className="w-full h-auto" preserveAspectRatio="none">
            <path
              d="M0,64 C360,120 1080,0 1440,64 L1440,120 L0,120 Z"
              fill="#F8F9FA"
            />
          </svg>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────── */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-4">
            Our Services
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            From residential homes to large commercial properties, we offer a
            full range of pest management solutions.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-xl shadow p-6 text-center space-y-3 hover:shadow-lg hover:-translate-y-1 transition"
              >
                <div className="flex justify-center">{s.icon}</div>
                <h3 className="font-semibold text-lg text-primary">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ─────────────────────────────────────── */}
      <section id="why-us" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-bold text-primary">Why Choose PAPECON?</h2>
            <p className="text-gray-500">
              We combine cutting-edge technology with decades of field expertise
              to keep your spaces safe and pest-free.
            </p>
            <ul className="space-y-3 pt-2">
              {WHY_US.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  {item.icon}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-2xl bg-primary/5 flex items-center justify-center">
              <FaCalendarCheck className="text-primary/20 text-8xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full leading-none rotate-180">
          <svg viewBox="0 0 1440 120" className="w-full h-auto" preserveAspectRatio="none">
            <path
              d="M0,64 C360,120 1080,0 1440,64 L1440,120 L0,120 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto text-center py-24 px-6 pt-36">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Go Pest-Free?
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Create an account and book your first service in minutes. Our team
            is standing by to help.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-10 py-3 bg-accent font-semibold rounded-lg shadow-lg hover:bg-accent-light transition"
          >
            Sign Up Now <FaArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────── */}
      <section id="contact" className="py-20 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold text-primary">Get in Touch</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Have questions or need a custom quote? Reach out and we'll respond
            within 24 hours.
          </p>
          <div className="flex justify-center gap-6 pt-4 flex-wrap text-gray-700">
            <div className="flex items-center gap-2">
              <FaPhoneAlt className="text-accent" /> <span>(02) 8123-4567</span>
            </div>
            <div className="flex items-center gap-2">
              <FaBug className="text-accent" /> <span>support@papecon.ph</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-primary-dark text-white/60 text-sm py-6 px-6 text-center mt-auto">
        &copy; {new Date().getFullYear()} PAPECON Pest Control Services. All rights reserved.
      </footer>
    </div>
  );
}
