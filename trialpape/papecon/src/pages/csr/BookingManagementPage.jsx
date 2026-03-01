import { useEffect, useMemo, useState } from "react";
import {
    getManagedBookings,
    getTechniciansForAssignment,
    getManagementSlotAvailability,
    assignTechnicianToBooking,
    confirmManagedBooking,
    cancelManagedBooking,
    rescheduleManagedBooking,
} from "../../api/bookingManagement";
import useAuth from "../../hooks/useAuth";
import { canAccessFeature } from "../../config/rbacMap";

const CANCELLATION_REASONS = [
    { value: "schedule_conflict", label: "Schedule conflict" },
    { value: "price_concern", label: "Price concern" },
    { value: "service_no_longer_needed", label: "Service no longer needed" },
    { value: "booked_by_mistake", label: "Booked by mistake" },
    { value: "location_unavailable", label: "Location unavailable" },
    { value: "other", label: "Other" },
];

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
            {labels[normalizedStatus] || normalizedStatus}
        </span>
    );
}

export default function BookingManagementPage() {
    const { role } = useAuth();
    const isCSR = role === "csr";
    const isOperations = role === "operations";
    const canManage = canAccessFeature(role, "booking.management");
    const canScheduleAppointments = canAccessFeature(role, "booking.schedule_appointments");
    const canAssign = canAccessFeature(role, "booking.assign_technician");

    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechByBooking, setSelectedTechByBooking] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [rescheduleDateByBooking, setRescheduleDateByBooking] = useState({});
    const [slotOptionsByBooking, setSlotOptionsByBooking] = useState({});
    const [selectedSlotByBooking, setSelectedSlotByBooking] = useState({});
    const [appointmentTypeByBooking, setAppointmentTypeByBooking] = useState({});
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReasonCode, setCancelReasonCode] = useState("schedule_conflict");
    const [cancelReasonDetails, setCancelReasonDetails] = useState("");
    const [cancelSaving, setCancelSaving] = useState(false);

    const sorted = useMemo(
        () => bookings.slice().sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [bookings]
    );

    const isHistoryBooking = (booking) => {
        const assignmentStatus = booking.assignment_status;
        return booking.status === "cancelled" || assignmentStatus === "done" || assignmentStatus === "completed";
    };

    const activeBookings = useMemo(
        () => sorted.filter((booking) => !isHistoryBooking(booking)),
        [sorted]
    );

    const historyBookings = useMemo(
        () => sorted.filter((booking) => isHistoryBooking(booking)),
        [sorted]
    );

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
                setError(err.response?.data?.detail || "Failed to load bookings.");
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const loadTechnicians = async () => {
        try {
            const res = await getTechniciansForAssignment();
            setTechnicians(res.data.technicians || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load technicians.");
        }
    };

    useEffect(() => {
        if (!canManage) return;

        loadBookings();
        if (canAssign) {
            loadTechnicians();
        }

        const intervalId = setInterval(() => {
            loadBookings({ silent: true });
        }, 10000);

        return () => clearInterval(intervalId);
    }, [canManage, canAssign]);

    useEffect(() => {
        const next = {};
        const nextDate = {};
        for (const booking of bookings) {
            next[booking.id] = booking.assigned_technician_user_id || "";
            nextDate[booking.id] = booking.service_date;
        }
        setSelectedTechByBooking(next);
        setRescheduleDateByBooking(nextDate);
        setAppointmentTypeByBooking(
            bookings.reduce((acc, booking) => {
                acc[booking.id] = isOperations ? "treatment" : "inspection";
                return acc;
            }, {})
        );
    }, [bookings, isOperations]);

    const loadSlotsForBooking = async (bookingId, serviceDate) => {
        try {
            const res = await getManagementSlotAvailability(serviceDate);
            setSlotOptionsByBooking((prev) => ({
                ...prev,
                [bookingId]: res.data.slots || [],
            }));
            const available = (res.data.slots || []).find((s) => s.available);
            setSelectedSlotByBooking((prev) => ({
                ...prev,
                [bookingId]: available?.slot || "",
            }));
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load available slots.");
        }
    };

    const submitReschedule = async (bookingId) => {
        const serviceDate = rescheduleDateByBooking[bookingId];
        const slot = selectedSlotByBooking[bookingId];
        const appointmentType = isOperations ? "treatment" : "inspection";
        const booking = bookings.find((item) => item.id === bookingId);

        if (isOperations && !booking?.assigned_technician_user_id) {
            setError("Assign a technician before scheduling treatment.");
            return;
        }

        if (isOperations && !(booking?.initial_findings || "").trim()) {
            setError("Technician findings are required before scheduling treatment.");
            return;
        }

        if (!serviceDate || !slot || !appointmentType) {
            setError("Select appointment type, service date, and slot before rescheduling.");
            return;
        }

        setError("");
        setSuccess("");
        try {
            await rescheduleManagedBooking(bookingId, {
                service_date: serviceDate,
                slot,
                appointment_type: appointmentType,
            });
            setSuccess("Appointment rescheduled successfully.");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reschedule appointment.");
        }
    };

    const confirmBooking = async (bookingId) => {
        setError("");
        setSuccess("");
        try {
            await confirmManagedBooking(bookingId);
            setSuccess("Booking confirmed.");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to confirm booking.");
        }
    };

    const openCancelModal = (booking) => {
        setCancelTarget(booking);
        setCancelReasonCode("schedule_conflict");
        setCancelReasonDetails("");
        setError("");
    };

    const closeCancelModal = () => {
        setCancelTarget(null);
        setCancelReasonCode("schedule_conflict");
        setCancelReasonDetails("");
    };

    const cancelBooking = async () => {
        if (!cancelTarget) return;
        setError("");
        setSuccess("");
        setCancelSaving(true);
        try {
            await cancelManagedBooking(cancelTarget.id, {
                reason_code: cancelReasonCode,
                reason_details: cancelReasonDetails?.trim() || null,
            });
            setSuccess("Booking cancelled.");
            await loadBookings();
            closeCancelModal();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to cancel booking.");
        } finally {
            setCancelSaving(false);
        }
    };

    const assignTechnician = async (bookingId) => {
        const selected = selectedTechByBooking[bookingId];
        if (!selected) {
            setError("Please select a technician first.");
            return;
        }

        setError("");
        setSuccess("");
        try {
            await assignTechnicianToBooking(bookingId, Number(selected));
            setSuccess("Technician assigned successfully.");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to assign technician.");
        }
    };

    if (!canManage) {
        return (
            <div className="bg-white shadow p-6 rounded-lg">
                <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Booking Management</h1>
                <p className="text-gray-600">You do not have permission to access booking management.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Booking Management</h1>
                    <p className="text-gray-600">
                        {isCSR
                            ? "CSR workflow: schedule initial inspection appointments. Auto-refresh every 10 seconds."
                            : "Operations workflow: assign technicians and schedule treatment after findings. Auto-refresh every 10 seconds."}
                    </p>
                    {lastUpdated && <p className="mt-1 text-gray-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
                </div>
                <button
                    type="button"
                    onClick={loadBookings}
                    className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                >
                    Refresh
                </button>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
            {success && <div className="bg-green-50 p-3 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

            <section className="bg-white shadow p-5 rounded-lg">
                {loading ? (
                    <p className="text-gray-500">Loading bookings...</p>
                ) : sorted.length === 0 ? (
                    <p className="text-gray-500">No bookings available.</p>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h2 className="mb-2 font-semibold text-neutral-900 text-base">Active Bookings</h2>
                            {activeBookings.length === 0 ? (
                                <p className="text-gray-500 text-sm">No active bookings. Completed/cancelled bookings are moved to history.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activeBookings.map((booking) => (
                                        <div key={booking.id} className="p-4 border border-gray-200 rounded">
                                            <div className="flex flex-wrap justify-between items-center gap-2">
                                                <p className="font-semibold text-neutral-900">
                                                    #{booking.id} · {booking.service_date} · {booking.slot}
                                                </p>
                                                <div className="flex gap-2">
                                                    <StatusBadge status={booking.status} />
                                                    {booking.assignment_status && <StatusBadge status={booking.assignment_status} />}
                                                </div>
                                            </div>

                                            <p className="mt-1 text-gray-600 text-sm">Client ID: {booking.user_id}</p>
                                            <p className="text-gray-600 text-sm">{booking.pest_type} · {booking.property_type}</p>
                                            <p className="text-gray-600 text-sm">{booking.address}</p>
                                            {booking.notes && <p className="mt-1 text-gray-500 text-sm">Notes: {booking.notes}</p>}
                                            <div className="mt-1 text-gray-600 text-sm">
                                                Assigned Technician: {booking.assigned_technician_name || "Not yet assigned"}
                                            </div>
                                            {booking.initial_findings && (
                                                <p className="mt-1 text-gray-600 text-sm">Inspection Findings: {booking.initial_findings}</p>
                                            )}

                                            <div className="gap-3 grid md:grid-cols-2 mt-3">
                                                <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                                                    <p className="mb-2 font-semibold text-neutral-900 text-sm">Booking Actions</p>
                                                    <div className="flex flex-wrap items-end gap-2">
                                                        {canAssign && booking.status !== "cancelled" && (
                                                            <>
                                                                <div>
                                                                    <label className="block mb-1 text-gray-600 text-xs">Technician</label>
                                                                    <select
                                                                        value={selectedTechByBooking[booking.id] || ""}
                                                                        onChange={(e) =>
                                                                            setSelectedTechByBooking((prev) => ({
                                                                                ...prev,
                                                                                [booking.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-2 border border-gray-300 rounded text-sm"
                                                                    >
                                                                        <option value="">Select Technician</option>
                                                                        {technicians.map((tech) => (
                                                                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => assignTechnician(booking.id)}
                                                                    disabled={!selectedTechByBooking[booking.id]}
                                                                    className="bg-accent hover:bg-accent/90 disabled:opacity-60 px-3 py-2 rounded text-white text-sm"
                                                                >
                                                                    Assign Technician
                                                                </button>
                                                            </>
                                                        )}

                                                        {booking.status === "pending" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => confirmBooking(booking.id)}
                                                                className="bg-primary hover:bg-primary/90 px-3 py-2 rounded text-white text-sm"
                                                            >
                                                                Confirm Booking
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => openCancelModal(booking)}
                                                            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-sm"
                                                        >
                                                            Cancel Booking
                                                        </button>
                                                    </div>
                                                </div>

                                                {canScheduleAppointments && (
                                                    <div className="bg-gray-50 p-3 border border-gray-200 rounded">
                                                        <p className="mb-2 font-semibold text-neutral-900 text-sm">Schedule Appointment</p>
                                                        <div className="gap-2 grid sm:grid-cols-2 lg:grid-cols-5">
                                                            <div>
                                                                <label className="block mb-1 text-gray-600 text-xs">Appointment Type</label>
                                                                <div className="bg-white px-2 py-2 border border-gray-300 rounded w-full text-sm">
                                                                    {isOperations ? "Treatment" : "Inspection"}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="block mb-1 text-gray-600 text-xs">Service Date</label>
                                                                <input
                                                                    type="date"
                                                                    value={rescheduleDateByBooking[booking.id] || booking.service_date}
                                                                    onChange={(e) =>
                                                                        setRescheduleDateByBooking((prev) => ({
                                                                            ...prev,
                                                                            [booking.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="px-2 py-2 border border-gray-300 rounded w-full text-sm"
                                                                />
                                                            </div>

                                                            <div className="sm:pt-6">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => loadSlotsForBooking(booking.id, rescheduleDateByBooking[booking.id] || booking.service_date)}
                                                                    className="bg-primary hover:bg-primary/90 px-3 py-2 rounded w-full text-white text-sm"
                                                                >
                                                                    Load Available Slots
                                                                </button>
                                                            </div>

                                                            <div>
                                                                <label className="block mb-1 text-gray-600 text-xs">Time Slot</label>
                                                                <select
                                                                    value={selectedSlotByBooking[booking.id] || ""}
                                                                    onChange={(e) =>
                                                                        setSelectedSlotByBooking((prev) => ({
                                                                            ...prev,
                                                                            [booking.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="px-2 py-2 border border-gray-300 rounded w-full text-sm"
                                                                >
                                                                    <option value="">Select Slot</option>
                                                                    {(slotOptionsByBooking[booking.id] || []).map((slotItem) => (
                                                                        <option
                                                                            key={slotItem.slot}
                                                                            value={slotItem.slot}
                                                                            disabled={!slotItem.available}
                                                                        >
                                                                            {slotItem.slot} {slotItem.available ? "(Available)" : "(Unavailable)"}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="sm:pt-6">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => submitReschedule(booking.id)}
                                                                    disabled={
                                                                        !selectedSlotByBooking[booking.id]
                                                                        || (isOperations && !booking.assigned_technician_user_id)
                                                                        || (isOperations && !(booking.initial_findings || "").trim())
                                                                    }
                                                                    className="bg-accent hover:bg-accent/90 disabled:opacity-60 px-3 py-2 rounded w-full text-white text-sm"
                                                                >
                                                                    Save Schedule
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isOperations && !booking.assigned_technician_user_id && (
                                                            <p className="mt-2 text-amber-700 text-xs">Assign a technician first before setting treatment schedule.</p>
                                                        )}
                                                        {isOperations && booking.assigned_technician_user_id && !(booking.initial_findings || "").trim() && (
                                                            <p className="mt-2 text-amber-700 text-xs">Treatment scheduling requires technician findings.</p>
                                                        )}
                                                        {isCSR && (
                                                            <p className="mt-2 text-gray-600 text-xs">CSR can only schedule initial inspection appointments.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="mb-2 font-semibold text-neutral-900 text-base">Booking History</h2>
                            {historyBookings.length === 0 ? (
                                <p className="text-gray-500 text-sm">No completed or cancelled bookings yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {historyBookings.map((booking) => (
                                        <div key={booking.id} className="bg-gray-50 p-4 border border-gray-200 rounded">
                                            <div className="flex flex-wrap justify-between items-center gap-2">
                                                <p className="font-semibold text-neutral-900">
                                                    #{booking.id} · {booking.service_date} · {booking.slot}
                                                </p>
                                                <div className="flex gap-2">
                                                    <StatusBadge status={booking.status} />
                                                    {booking.assignment_status && <StatusBadge status={booking.assignment_status} />}
                                                </div>
                                            </div>
                                            <p className="mt-1 text-gray-600 text-sm">Client ID: {booking.user_id}</p>
                                            <p className="text-gray-600 text-sm">{booking.pest_type} · {booking.property_type}</p>
                                            <p className="text-gray-600 text-sm">{booking.address}</p>
                                            <p className="text-gray-600 text-sm">
                                                Appointment Type: {booking.appointment_type || "inspection"}
                                            </p>
                                            <div className="mt-1 text-gray-600 text-sm">
                                                Assigned Technician: {booking.assigned_technician_name || "Not yet assigned"}
                                            </div>
                                            {booking.initial_findings && (
                                                <p className="mt-1 text-gray-600 text-sm">Inspection Findings: {booking.initial_findings}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {cancelTarget && (
                <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 p-4">
                    <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-lg">
                        <h3 className="mb-2 font-bold text-neutral-900 text-xl">Cancel Booking</h3>
                        <p className="mb-4 text-gray-600 text-sm">
                            Select a cancellation reason for booking <span className="font-semibold">#{cancelTarget.id}</span>.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Reason</label>
                                <select
                                    value={cancelReasonCode}
                                    onChange={(e) => setCancelReasonCode(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded w-full"
                                >
                                    {CANCELLATION_REASONS.map((reason) => (
                                        <option key={reason.value} value={reason.value}>{reason.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Additional Details (optional)</label>
                                <textarea
                                    rows={3}
                                    value={cancelReasonDetails}
                                    onChange={(e) => setCancelReasonDetails(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded w-full"
                                    placeholder="Add brief details for the cancellation..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={closeCancelModal}
                                className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded text-gray-700"
                            >
                                Keep Booking
                            </button>
                            <button
                                type="button"
                                onClick={cancelBooking}
                                disabled={cancelSaving}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 rounded text-white"
                            >
                                {cancelSaving ? "Cancelling..." : "Confirm Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
