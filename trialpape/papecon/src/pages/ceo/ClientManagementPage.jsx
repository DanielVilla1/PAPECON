import { useState, useEffect, useCallback } from "react";
import {
  getUsers,
  deactivateUser,
  activateUser,
} from "../../api/auth";
import toast from "react-hot-toast";

/* ── Helpers ───────────────────────────────────────── */
function Badge({ children, color }) {
  const colors = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ── Status filter tabs ────────────────────────────── */
const TABS = [
  { key: "all",        label: "All Clients" },
  { key: "approved",   label: "Active" },
  { key: "pending",    label: "Pending" },
  { key: "unverified", label: "Unverified" },
  { key: "rejected",   label: "Rejected" },
];

export default function ClientManagementPage() {
  const [tab, setTab] = useState("all");
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* ── Fetch clients (role=client, optional status) ── */
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = tab === "all" ? undefined : tab;
      const res = await getUsers(statusParam, "client");
      setClients(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /* ── Toggle active / deactivate ──────────────────── */
  const handleToggleActive = async (user) => {
    try {
      const res = user.is_active
        ? await deactivateUser(user.id)
        : await activateUser(user.id);
      toast.success(res.data.message);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  /* ── Search filter (client-side) ─────────────────── */
  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()),
      )
    : clients;

  /* ── Status badge helper ─────────────────────────── */
  const statusBadge = (u) => {
    if (!u.is_email_verified) return <Badge color="yellow">Unverified</Badge>;
    if (u.rejected_reason) return <Badge color="red">Rejected</Badge>;
    if (!u.is_approved) return <Badge color="yellow">Pending Approval</Badge>;
    if (!u.is_active) return <Badge color="red">Deactivated</Badge>;
    return <Badge color="green">Active</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Client Management</h1>
          <p className="text-gray-500 text-sm">View and manage all registered clients.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition ${
              tab === t.key
                ? "bg-primary text-white"
                : "text-gray-600 hover:text-primary hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Clients" value={total} />
        <SummaryCard label="Active" value={clients.filter((c) => c.is_approved && c.is_active).length} color="text-green-600" />
        <SummaryCard label="Pending" value={clients.filter((c) => c.is_email_verified && !c.is_approved && !c.rejected_reason).length} color="text-yellow-600" />
        <SummaryCard label="Deactivated" value={clients.filter((c) => !c.is_active).length} color="text-red-600" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {search.trim() ? "No clients match your search." : "No clients found."}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Registered</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email Verified</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Login</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3">{statusBadge(c)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.email_verified_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.last_login_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-3 py-1 text-xs rounded transition ${
                          c.is_active
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {total} client{total !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small summary card component ──────────────────── */
function SummaryCard({ label, value, color = "text-gray-800" }) {
  return (
    <div className="bg-white rounded-lg shadow px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
