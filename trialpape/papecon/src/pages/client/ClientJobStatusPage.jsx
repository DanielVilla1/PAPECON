import { useEffect, useMemo, useState } from "react";
import { getMyBookings } from "../../api/booking";

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
    return labels[normalized] || normalized || "Unknown";
}

function getStepIndex(status) {
    const normalized = normalizeStatus(status);
    const index = PROGRESS_STEPS.indexOf(normalized);
    return index === -1 ? 0 : index;
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
        completed: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[normalizedStatus] || "bg-gray-100 text-gray-700"}`}>
            {statusLabel(status)}
        </span>
    );
}

function ProgressBar({ status }) {
    const currentIndex = getStepIndex(status || "assigned");

    return (
        <div className="mt-3">
            <div className="gap-2 grid grid-cols-4">
                {PROGRESS_STEPS.map((step, idx) => {
                    const active = idx <= currentIndex;
                    return (
                        <div key={step} className="space-y-1">
                            <div className={`h-2 rounded ${active ? "bg-primary" : "bg-gray-200"}`} />
                            <p className={`text-[11px] ${active ? "text-neutral-900 font-medium" : "text-gray-500"}`}>
                                {step.replace("_", " ")}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ClientJobStatusPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchJobs = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getMyBookings();
            setJobs(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load job status.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const orderedJobs = useMemo(
        () => jobs.slice().sort((a, b) => `${b.service_date} ${b.slot}`.localeCompare(`${a.service_date} ${a.slot}`)),
        [jobs]
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Job Status</h1>
                    <p className="text-gray-600">Track your assigned technician progress from assignment to completion.</p>
                </div>
                <button
                    type="button"
                    onClick={fetchJobs}
                    className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                >
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

            <section className="bg-white shadow p-5 rounded-lg">
                {loading ? (
                    <p className="text-gray-500">Loading job status...</p>
                ) : orderedJobs.length === 0 ? (
                    <p className="text-gray-500">No bookings yet. Create a booking to start tracking progress.</p>
                ) : (
                    <div className="space-y-4">
                        {orderedJobs.map((job) => (
                            <div key={job.id} className="p-4 border border-gray-200 rounded">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <p className="font-semibold text-neutral-900">
                                        {job.service_date} · {job.slot}
                                    </p>
                                    <div className="flex gap-2">
                                        <StatusBadge status={job.status} />
                                        {job.assignment_status && <StatusBadge status={job.assignment_status} />}
                                    </div>
                                </div>

                                <p className="mt-1 text-gray-600 text-sm">Location: {job.address}</p>
                                <p className="text-gray-600 text-sm">Service: {job.pest_type} · {job.property_type}</p>
                                <p className="text-gray-600 text-sm">Appointment Type: {job.appointment_type || "inspection"}</p>
                                <p className="mt-1 text-gray-600 text-sm">
                                    Assigned Technician: {job.assigned_technician_name || "Waiting for assignment"}
                                </p>

                                {job.assignment_status ? (
                                    <ProgressBar status={normalizeStatus(job.assignment_status)} />
                                ) : (
                                    <p className="mt-2 text-gray-500 text-xs">Progress tracking starts once your booking is assigned.</p>
                                )}

                                {job.initial_findings && (
                                    <div className="bg-gray-50 mt-3 p-3 border border-gray-200 rounded">
                                        <p className="mb-1 font-semibold text-gray-700 text-xs">Initial Field Findings</p>
                                        <p className="text-gray-700 text-sm">{job.initial_findings}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
