import { useState, useEffect, useCallback } from "react";
import {
  getUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  activateUser,
  changeUserRole,
  unlockUser,
} from "../../api/auth";
import toast from "react-hot-toast";

const TABS = [
  { key: "pending", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "unverified", label: "Unverified" },
  { key: "", label: "All Users" },
];

const ROLES = [
  "ceo", "operations", "finance", "technical",
  "hr", "technician", "csr", "client", "developer",
];

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

export default function UserManagementPage() {
  const [tab, setTab] = useState("pending");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // user id
  const [rejectReason, setRejectReason] = useState("");
  const [roleModal, setRoleModal] = useState(null); // { id, currentRole }
  const [newRole, setNewRole] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers(tab || undefined);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Actions ─────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      const res = await approveUser(id);
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approve failed");
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const res = await rejectUser(rejectModal, rejectReason);
      toast.success(res.data.message);
      setRejectModal(null);
      setRejectReason("");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reject failed");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = user.is_active
        ? await deactivateUser(user.id)
        : await activateUser(user.id);
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const handleUnlock = async (id) => {
    try {
      const res = await unlockUser(id);
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unlock failed");
    }
  };

  const handleChangeRole = async () => {
    if (!roleModal || !newRole) return;
    try {
      const res = await changeUserRole(roleModal.id, newRole);
      toast.success(res.data.message);
      setRoleModal(null);
      setNewRole("");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Role change failed");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-1">User Management</h1>
      <p className="text-gray-500 text-sm mb-6">Approve registrations, manage roles, and moderate accounts.</p>

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

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users found.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Registered</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 space-x-1">
                    {u.is_email_verified ? (
                      <Badge color="green">Verified</Badge>
                    ) : (
                      <Badge color="yellow">Unverified</Badge>
                    )}
                    {u.is_approved ? (
                      <Badge color="green">Approved</Badge>
                    ) : u.rejected_reason ? (
                      <Badge color="red">Rejected</Badge>
                    ) : (
                      <Badge color="yellow">Pending</Badge>
                    )}
                    {!u.is_active && <Badge color="red">Deactivated</Badge>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {/* Approve (only for verified + pending) */}
                      {u.is_email_verified && !u.is_approved && !u.rejected_reason && (
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                      )}

                      {/* Reject */}
                      {u.is_email_verified && !u.is_approved && !u.rejected_reason && (
                        <button
                          onClick={() => { setRejectModal(u.id); setRejectReason(""); }}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      )}

                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1 text-xs rounded transition ${
                          u.is_active
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>

                      {/* Change role */}
                      <button
                        onClick={() => { setRoleModal({ id: u.id, currentRole: u.role }); setNewRole(u.role); }}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition"
                      >
                        Role
                      </button>

                      {/* Unlock */}
                      <button
                        onClick={() => handleUnlock(u.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition"
                        title="Reset failed login attempts"
                      >
                        Unlock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            {total} user{total !== 1 ? "s" : ""} total
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-red-700 mb-3">Reject Registration</h3>
            <label className="block text-sm text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              placeholder="e.g. Duplicate account, incomplete information…"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleReject} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Role Change Modal ────────────────────────── */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-primary mb-3">Change Role</h3>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRoleModal(null)} className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                disabled={newRole === roleModal.currentRole}
                className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
