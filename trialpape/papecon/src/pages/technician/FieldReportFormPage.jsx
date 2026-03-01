import { useEffect, useMemo, useState } from "react";
import { getMyAssignments, logInitialFindings } from "../../api/technician";

function StatusBadge({ status }) {
    const normalizedStatus = status === "treatment_done" ? "treatment_ongoing" : status === "done" ? "completed" : status;
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

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[normalizedStatus] || "bg-gray-100 text-gray-700"}`}>
            {labels[normalizedStatus] || "Assigned"}
        </span>
    );
}

export default function FieldReportFormPage() {
    const [jobs, setJobs] = useState([]);
    const [findingsByBooking, setFindingsByBooking] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const normalizeStatus = (status) => {
        if (status === "treatment_done") return "treatment_ongoing";
        if (status === "done") return "completed";
        return status;
    };

    const activeForInspection = useMemo(
        () => jobs.filter((job) => {
            const bookingStatus = normalizeStatus(job.status);
            const assignmentStatus = normalizeStatus(job.assignment_status || "assigned");
            return !["cancelled", "done", "completed"].includes(bookingStatus)
                && !["cancelled", "done", "completed"].includes(assignmentStatus);
        }),
        [jobs]
    );

    const history = useMemo(
        () => jobs.slice().sort((a, b) => `${b.service_date} ${b.slot}`.localeCompare(`${a.service_date} ${a.slot}`)),
        [jobs]
    );

    const loadJobs = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getMyAssignments(true);
            setJobs(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load technician jobs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        const next = {};
        for (const job of jobs) {
            next[job.id] = job.initial_findings || "";
        }
        setFindingsByBooking(next);
    }, [jobs]);

    const saveFindings = async (bookingId) => {
        setError("");
        setSuccess("");
        const findings = findingsByBooking[bookingId]?.trim();
        if (!findings) {
            setError("Please provide findings before saving.");
            return;
        }

        try {
            await logInitialFindings(bookingId, findings);
            setSuccess("Field report saved successfully.");
            await loadJobs();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save field report.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Field Report</h1>
                    <p className="text-gray-600">Log initial inspection findings and review full report/status history.</p>
                </div>
                <button
                    type="button"
                    onClick={loadJobs}
                    className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                >
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
            {success && <div className="bg-green-50 p-3 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

            <section className="bg-white shadow p-5 rounded-lg">
                <h2 className="mb-3 font-semibold text-neutral-900 text-lg">Initial Inspection Stage</h2>
                {loading ? (
                    <p className="text-gray-500">Loading jobs...</p>
                ) : activeForInspection.length === 0 ? (
                    <p className="text-gray-500">No active jobs for inspection reporting.</p>
                ) : (
                    <div className="space-y-3">
                        {activeForInspection.map((job) => (
                            <div key={job.id} className="p-4 border border-gray-200 rounded">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <p className="font-semibold text-neutral-900">
                                        {job.service_date} · {job.slot}
                                    </p>
                                    <div className="flex gap-2">
                                        <StatusBadge status={job.status} />
                                        <StatusBadge status={job.assignment_status} />
                                    </div>
                                </div>
                                <p className="mt-1 text-gray-600 text-sm">Location: {job.address}</p>
                                <p className="text-gray-600 text-sm">Appointment Type: {job.appointment_type || "inspection"}</p>
                                <textarea
                                    rows={3}
                                    value={findingsByBooking[job.id] || ""}
                                    onChange={(e) => setFindingsByBooking((prev) => ({ ...prev, [job.id]: e.target.value }))}
                                    className="mt-3 px-3 py-2 border border-gray-300 rounded w-full text-sm"
                                    placeholder="Enter inspection findings, observed severity, and recommendations..."
                                />
                                <button
                                    type="button"
                                    onClick={() => saveFindings(job.id)}
                                    className="bg-primary hover:bg-primary/90 mt-2 px-3 py-2 rounded text-white text-sm"
                                >
                                    Save Field Report
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-white shadow p-5 rounded-lg">
                <h2 className="mb-3 font-semibold text-neutral-900 text-lg">Report and Job Status History</h2>
                {history.length === 0 ? (
                    <p className="text-gray-500">No history available.</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((job) => (
                            <div key={job.id} className="p-4 border border-gray-200 rounded">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <p className="font-semibold text-neutral-900">
                                        {job.service_date} · {job.slot}
                                    </p>
                                    <div className="flex gap-2">
                                        <StatusBadge status={job.status} />
                                        <StatusBadge status={job.assignment_status} />
                                    </div>
                                </div>
                                <p className="mt-1 text-gray-600 text-sm">Location: {job.address}</p>
                                <p className="text-gray-600 text-sm">Service: {job.pest_type} · {job.property_type}</p>
                                <p className="text-gray-600 text-sm">Appointment Type: {job.appointment_type || "inspection"}</p>
                                {job.initial_findings && <p className="mt-1 text-gray-600 text-sm">Findings: {job.initial_findings}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
