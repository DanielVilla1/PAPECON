import { useEffect, useMemo, useState } from "react";
import {
    getMyAssignments,
    logInitialFindings,
    updateTechnicianJobStatus,
} from "../../api/technician";

function normalizeStatus(status) {
    if (status === "treatment_done") return "treatment_ongoing";
    if (status === "done") return "completed";
    return status || "assigned";
}

function statusLabel(status) {
    const normalizedStatus = normalizeStatus(status);
    const labels = {
        pending: "Pending",
        confirmed: "Confirmed",
        cancelled: "Cancelled",
        assigned: "Assigned",
        inspection_logged: "Inspection Logged",
        treatment_ongoing: "Treatment Ongoing",
        treatment_done: "Treatment Ongoing",
        done: "Completed",
        completed: "Completed",
    };
    return labels[normalizedStatus] || normalizedStatus;
}

function StatusBadge({ status }) {
    const normalizedStatus = normalizeStatus(status);
    const map = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
        assigned: "bg-blue-100 text-blue-800",
        inspection_logged: "bg-purple-100 text-purple-800",
        treatment_ongoing: "bg-indigo-100 text-indigo-800",
        treatment_done: "bg-indigo-100 text-indigo-800",
        done: "bg-gray-200 text-gray-800",
        completed: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[normalizedStatus] || "bg-gray-100 text-gray-700"}`}>
            {statusLabel(normalizedStatus)}
        </span>
    );
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [statusByBooking, setStatusByBooking] = useState({});
    const [findingsByBooking, setFindingsByBooking] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const ordered = useMemo(
        () => assignments
            .filter((job) => normalizeStatus(job.status) !== "cancelled" && normalizeStatus(job.assignment_status) !== "cancelled")
            .slice()
            .sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [assignments]
    );

    const loadAssignments = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getMyAssignments();
            setAssignments(res.data.bookings || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load your assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments();
    }, []);

    useEffect(() => {
        const nextStatuses = {};
        const nextFindings = {};
        for (const job of assignments) {
            const normalized = normalizeStatus(job.assignment_status);
            nextStatuses[job.id] = normalized === "assigned" ? "inspection_logged" : normalized;
            nextFindings[job.id] = job.initial_findings || "";
        }
        setStatusByBooking(nextStatuses);
        setFindingsByBooking(nextFindings);
    }, [assignments]);

    const submitFindings = async (bookingId) => {
        setError("");
        setSuccess("");
        const findings = findingsByBooking[bookingId]?.trim();
        if (!findings) {
            setError("Please provide findings before saving.");
            return;
        }

        try {
            await logInitialFindings(bookingId, findings);
            setSuccess("Findings saved successfully.");
            await loadAssignments();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save findings.");
        }
    };

    const submitStatus = async (bookingId) => {
        setError("");
        setSuccess("");
        try {
            await updateTechnicianJobStatus(bookingId, statusByBooking[bookingId]);
            setSuccess("Job status updated.");
            await loadAssignments();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to update job status.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">My Assignments</h1>
                    <p className="text-gray-600">Manage your active jobs with clear status updates and fewer clicks.</p>
                    {lastUpdated && <p className="mt-1 text-gray-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
                </div>
                <button
                    type="button"
                    onClick={loadAssignments}
                    className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                >
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
            {success && <div className="bg-green-50 p-3 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

            <section className="bg-white shadow p-5 rounded-lg">
                {loading ? (
                    <p className="text-gray-500">Loading assignments...</p>
                ) : ordered.length === 0 ? (
                    <p className="text-gray-500">No active assignments. Completed/done jobs are moved out of this tab.</p>
                ) : (
                    <div className="space-y-3">
                        {ordered.map((job) => (
                            <div key={job.id} className="p-4 border border-gray-200 rounded">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <p className="font-semibold text-neutral-900">
                                        Job #{job.id} · {job.service_date} · {job.slot}
                                    </p>
                                    <div className="flex gap-2">
                                        <StatusBadge status={job.status} />
                                        <StatusBadge status={job.assignment_status} />
                                    </div>
                                </div>

                                <div className="gap-x-6 gap-y-1 grid md:grid-cols-2 mt-3 text-sm">
                                    <p className="text-gray-600"><span className="font-medium">Location:</span> {job.address}</p>
                                    <p className="text-gray-600"><span className="font-medium">Service:</span> {job.pest_type} · {job.property_type}</p>
                                    <p className="text-gray-600"><span className="font-medium">Appointment Type:</span> {job.appointment_type || "inspection"}</p>
                                    <p className="text-gray-600"><span className="font-medium">Current Progress:</span> {statusLabel(job.assignment_status)}</p>
                                </div>

                                {job.notes && <p className="mt-1 text-gray-500 text-sm">Notes: {job.notes}</p>}
                                {job.initial_findings && <p className="mt-1 text-gray-600 text-sm">Findings: {job.initial_findings}</p>}
                                {job.assigned_at && <p className="mt-2 text-gray-500 text-xs">Assigned at: {new Date(job.assigned_at).toLocaleString()}</p>}

                                <div className="bg-gray-50 mt-4 p-3 border border-gray-200 rounded">
                                    <p className="mb-2 font-semibold text-neutral-900 text-sm">Job Findings</p>
                                    <textarea
                                        rows={3}
                                        value={findingsByBooking[job.id] || ""}
                                        onChange={(e) =>
                                            setFindingsByBooking((prev) => ({ ...prev, [job.id]: e.target.value }))
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded w-full text-sm"
                                        placeholder="Enter inspection findings, observed severity, and recommendations..."
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="button"
                                            onClick={() => submitFindings(job.id)}
                                            className="bg-primary hover:bg-primary/90 px-3 py-2 rounded text-white text-sm"
                                        >
                                            Save Findings
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 mt-4 p-3 border border-gray-200 rounded">
                                    <p className="mb-2 font-semibold text-neutral-900 text-sm">Update Job Progress</p>
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div>
                                            <label className="block mb-1 text-gray-600 text-xs">New Status</label>
                                            <select
                                                value={statusByBooking[job.id] || "assigned"}
                                                onChange={(e) =>
                                                    setStatusByBooking((prev) => ({ ...prev, [job.id]: e.target.value }))
                                                }
                                                className="px-3 py-2 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="inspection_logged">Inspection Logged</option>
                                                <option value="treatment_ongoing">Treatment Ongoing</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => submitStatus(job.id)}
                                            disabled={
                                                normalizeStatus(statusByBooking[job.id]) === normalizeStatus(job.assignment_status)
                                                || !(job.initial_findings || "").trim()
                                            }
                                            className="bg-accent hover:bg-accent/90 disabled:opacity-60 px-3 py-2 rounded text-white text-sm"
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                    {!(job.initial_findings || "").trim() && (
                                        <p className="mt-2 text-amber-700 text-xs">Save findings first before updating job status.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
