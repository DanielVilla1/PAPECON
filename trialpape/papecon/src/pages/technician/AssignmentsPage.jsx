import { useEffect, useMemo, useState } from "react";
import {
    getMyAssignments,
    updateTechnicianJobStatus,
} from "../../api/technician";

function StatusBadge({ status }) {
    const map = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
        assigned: "bg-blue-100 text-blue-800",
        inspection_logged: "bg-purple-100 text-purple-800",
        treatment_done: "bg-indigo-100 text-indigo-800",
        done: "bg-gray-200 text-gray-800",
        completed: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
            {status}
        </span>
    );
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [statusByBooking, setStatusByBooking] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const ordered = useMemo(
        () => assignments.slice().sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [assignments]
    );

    const loadAssignments = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getMyAssignments();
            setAssignments(res.data.bookings || []);
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
        for (const job of assignments) {
            nextStatuses[job.id] = job.assignment_status || "assigned";
        }
        setStatusByBooking(nextStatuses);
    }, [assignments]);

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
                    <p className="text-gray-600">Active assigned jobs for treatment tracking. Jobs marked done are removed from this tab.</p>
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
                                        {job.service_date} · {job.slot}
                                    </p>
                                    <StatusBadge status={job.status} />
                                </div>

                                <p className="mt-1 text-gray-600 text-sm">Location: {job.address}</p>
                                <p className="text-gray-600 text-sm">Service: {job.pest_type} · {job.property_type}</p>
                                <div className="mt-1 text-gray-600 text-sm">
                                    Job Tracking Status: <span className="font-medium">{job.assignment_status || "assigned"}</span>
                                </div>
                                {job.notes && <p className="mt-1 text-gray-500 text-sm">Notes: {job.notes}</p>}
                                {job.assigned_at && <p className="mt-2 text-gray-500 text-xs">Assigned at: {new Date(job.assigned_at).toLocaleString()}</p>}

                                <div className="mt-4 p-3 border border-gray-200 rounded">
                                    <p className="mb-2 font-semibold text-neutral-900 text-sm">Treatment Job Status</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            value={statusByBooking[job.id] || "assigned"}
                                            onChange={(e) =>
                                                setStatusByBooking((prev) => ({ ...prev, [job.id]: e.target.value }))
                                            }
                                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="assigned">Assigned</option>
                                            <option value="inspection_logged">Inspection Logged</option>
                                            <option value="treatment_done">Treatment Done</option>
                                            <option value="done">Done</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => submitStatus(job.id)}
                                            className="bg-accent hover:bg-accent/90 px-3 py-2 rounded text-white text-sm"
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
