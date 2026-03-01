import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { register as registerAPI } from "../../api/auth";

/* ── Password-strength helpers ─────────────────────── */
const PW_RULES = [
  { re: /.{8,}/, label: "At least 8 characters" },
  { re: /[A-Z]/, label: "One uppercase letter" },
  { re: /[a-z]/, label: "One lowercase letter" },
  { re: /\d/, label: "One digit" },
  { re: /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'/`~]/, label: "One special character" },
];

function usePasswordStrength(pw) {
  return useMemo(() => {
    const passed = PW_RULES.filter((r) => r.re.test(pw));
    const score = passed.length; // 0-5
    let color = "bg-red-500";
    let text = "Weak";
    if (score >= 5) { color = "bg-green-500"; text = "Strong"; }
    else if (score >= 3) { color = "bg-yellow-500"; text = "Medium"; }
    return { score, maxScore: PW_RULES.length, color, text, results: PW_RULES.map((r) => ({ ...r, ok: r.re.test(pw) })) };
  }, [pw]);
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const strength = usePasswordStrength(form.password);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side password match
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // Client-side strength gate
    if (strength.score < strength.maxScore) {
      setError("Password does not meet all strength requirements.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerAPI({ name: form.name, email: form.email, password: form.password });
      setSuccessMsg(res.data.message);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      // Pydantic validation returns array of errors
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(" "));
      } else {
        setError(detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">Registration Submitted!</h2>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">{successMsg}</p>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 text-left text-sm">
            <p className="font-semibold text-blue-800 mb-2">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Check your email for a verification link</li>
              <li>Click the link to verify your email address</li>
              <li>An admin will review and approve your account</li>
              <li>You'll be notified once approved</li>
            </ol>
          </div>

          <Link
            to="/login"
            className="inline-block w-full bg-primary text-white py-2 rounded font-semibold hover:bg-primary/90 transition"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-2">PAPECON</h1>
        <p className="text-center text-gray-500 mb-6">Create your client account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" name="name" value={form.name} onChange={handleChange} required
              autoComplete="name"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" name="email" value={form.email} onChange={handleChange} required
              autoComplete="email"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" name="password" value={form.password} onChange={handleChange} required
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / strength.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.text === "Strong" ? "text-green-600" :
                    strength.text === "Medium" ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {strength.text}
                  </span>
                </div>

                {/* Requirements checklist */}
                <ul className="space-y-0.5 mt-1">
                  {strength.results.map((r, i) => (
                    <li key={i} className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-green-600" : "text-gray-400"}`}>
                      {r.ok ? (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-primary text-white py-2 rounded font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Registering…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
