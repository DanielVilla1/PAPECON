import { useEffect, useMemo, useState } from "react";
import { getManagedBookings } from "../../api/bookingManagement";

const PROGRESS_STEPS = ["assigned", "inspection_logged", "treatment_ongoing", "completed"];

function normalizeStatus(status) {
    if (status === "treatment_done") return "treatment_ongoing";
    if (status === "done") return "completed";
    return status;
}

function statusLabel(status) {
    const normalized = normalizeStatus(status);
    const labels = {
        pending: "Pending",
        confirmed: "Confirmed",
        cancelled: "Cancelled",
        assigned: "Assigned",
        inspection_logged: "Inspection Logged",
        treatment_ongoing: "Treatment Ongoing",
        completed: "Completed",
    };
    return labels[normalized] || "Not Started";
}

function jobTrackingStatus(job) {
    if (normalizeStatus(job.status) === "cancelled") return "cancelled";
    return normalizeStatus(job.assignment_status || job.status);
}

function progressIndex(status) {
    const normalized = normalizeStatus(status);
    const idx = PROGRESS_STEPS.indexOf(normalized);
    return idx === -1 ? 0 : idx;
}

function ProgressBar({ status }) {
    const current = progressIndex(status || "assigned");

    return (
        <div className="mt-3">
            <div className="gap-2 grid grid-cols-4">
                {PROGRESS_STEPS.map((step, index) => {
                    const active = index <= current;
                    return (
                        <div key={step} className="space-y-1">
                            <div className={`h-2 rounded ${active ? "bg-primary" : "bg-gray-200"}`} />
                            <p className={`text-[11px] ${active ? "text-neutral-900 font-medium" : "text-gray-500"}`}>
                                {statusLabel(step)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const normalized = normalizeStatus(status);
    const map = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
        assigned: "bg-blue-100 text-blue-800",
        inspection_logged: "bg-purple-100 text-purple-800",
        treatment_ongoing: "bg-indigo-100 text-indigo-800",
        completed: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[normalized] || "bg-gray-100 text-gray-700"}`}>
            {statusLabel(normalized)}
        </span>
    );
}

export default function JobStatusPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadBookings = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError("");
        }

        try {
            const res = await getManagedBookings();
            setBookings(res.data.bookings || []);
            setLastUpdated(new Date());
        } catch (err) {
            if (!silent) {
                setError(err.response?.data?.detail || "Failed to load job status data.");
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadBookings();
        const intervalId = setInterval(() => loadBookings({ silent: true }), 10000);
        return () => clearInterval(intervalId);
    }, []);

    const sorted = useMemo(
        () => bookings.slice().sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [bookings]
    );

    const activeJobs = useMemo(
        () => sorted.filter((job) => !["cancelled", "done", "completed"].includes(jobTrackingStatus(job))),
        [sorted]
    );

    const completedJobs = useMemo(
        () => sorted.filter((job) => ["cancelled", "done", "completed"].includes(jobTrackingStatus(job))),
        [sorted]
    );

    const summary = useMemo(() => {
        const total = sorted.length;
        const active = activeJobs.length;
        const completed = completedJobs.filter((job) => jobTrackingStatus(job) !== "cancelled").length;
        const cancelled = completedJobs.filter((job) => jobTrackingStatus(job) === "cancelled").length;
        const unassigned = activeJobs.filter((job) => !job.assigned_technician_name).length;
        const treatmentOngoing = activeJobs.filter((job) => normalizeStatus(job.assignment_status) === "treatment_ongoing").length;

        return { total, active, completed, cancelled, unassigned, treatmentOngoing };
    }, [sorted, activeJobs, completedJobs]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Job Status</h1>
                    <p className="text-gray-600">Operational tracker for assignment, treatment progress, and completion status. Auto-refresh every 10 seconds.</p>
                    {lastUpdated && <p className="mt-1 text-gray-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
                </div>
                <button
                    type="button"
                    onClick={() => loadBookings()}
                    className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                >
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

            <section className="gap-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Total Jobs</p>
                    <p className="font-bold text-neutral-900 text-xl">{summary.total}</p>
                </div>
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Active</p>
                    <p className="font-bold text-blue-700 text-xl">{summary.active}</p>
                </div>
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Treatment Ongoing</p>
                    <p className="font-bold text-indigo-700 text-xl">{summary.treatmentOngoing}</p>
                </div>
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Completed</p>
                    <p className="font-bold text-emerald-700 text-xl">{summary.completed}</p>
                </div>
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Cancelled</p>
                    <p className="font-bold text-red-700 text-xl">{summary.cancelled}</p>
                </div>
                <div className="bg-white shadow p-3 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 text-xs">Unassigned</p>
                    <p className="font-bold text-amber-700 text-xl">{summary.unassigned}</p>
                </div>
            </section>

            <section className="bg-white shadow p-5 rounded-lg">
                {loading ? (
                    <p className="text-gray-500">Loading jobs...</p>
                ) : sorted.length === 0 ? (
                    <p className="text-gray-500">No jobs available.</p>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h2 className="mb-2 font-semibold text-neutral-900 text-base">Active Jobs</h2>
                            {activeJobs.length === 0 ? (
                                <p className="text-gray-500 text-sm">No active jobs right now.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activeJobs.map((job) => (
                                        <div key={job.id} className="p-4 border border-gray-200 rounded">
                                            <div className="flex flex-wrap justify-between items-center gap-2">
                                                <p className="font-semibold text-neutral-900">#{job.id} · {job.service_date} · {job.slot}</p>
                                                <div className="flex gap-2">
                                                    <StatusBadge status={job.status} />
                                                    <StatusBadge status={job.assignment_status || "assigned"} />
                                                </div>
                                            </div>

                                            <div className="gap-2 grid md:grid-cols-2 lg:grid-cols-3 mt-2 text-sm">
                                                <p className="text-gray-600">Client ID: {job.user_id}</p>
                                                <p className="text-gray-600">Technician: {job.assigned_technician_name || "Not assigned"}</p>
                                                <p className="text-gray-600">Appointment Type: {job.appointment_type || "inspection"}</p>
                                                <p className="text-gray-600">Service: {job.pest_type} · {job.property_type}</p>
                                                <p className="md:col-span-2 text-gray-600">Address: {job.address}</p>
                                            </div>
                                            {job.initial_findings && <p className="mt-2 text-gray-600 text-sm">Inspection Findings: {job.initial_findings}</p>}

                                            <ProgressBar status={normalizeStatus(job.assignment_status || "assigned")} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="mb-2 font-semibold text-neutral-900 text-base">Completed / Cancelled</h2>
                            {completedJobs.length === 0 ? (
                                <p className="text-gray-500 text-sm">No completed or cancelled jobs yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {completedJobs.map((job) => (
                                        <div key={job.id} className="bg-gray-50 p-4 border border-gray-200 rounded">
                                            <div className="flex flex-wrap justify-between items-center gap-2">
                                                <p className="font-semibold text-neutral-900">#{job.id} · {job.service_date} · {job.slot}</p>
                                                <div className="flex gap-2">
                                                    <StatusBadge status={job.status} />
                                                    {job.assignment_status && <StatusBadge status={job.assignment_status} />}
                                                </div>
                                            </div>
                                            <div className="gap-2 grid md:grid-cols-2 lg:grid-cols-3 mt-2 text-sm">
                                                <p className="text-gray-600">Technician: {job.assigned_technician_name || "Not assigned"}</p>
                                                <p className="text-gray-600">Appointment Type: {job.appointment_type || "inspection"}</p>
                                                <p className="md:col-span-2 text-gray-600">Address: {job.address}</p>
                                            </div>
                                            {job.initial_findings && <p className="mt-2 text-gray-600 text-sm">Inspection Findings: {job.initial_findings}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
