import { useEffect, useMemo, useState } from "react";
import {
    getSlotAvailability,
    getMyBookings,
    createBooking,
    confirmBooking,
    cancelBooking,
} from "../api/booking";

function todayISO() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().split("T")[0];
}

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

export default function BookingPage({ view = "all" }) {
    const showNewBooking = view === "all" || view === "new";
    const showMyBookings = view === "all" || view === "my";

    const [serviceDate, setServiceDate] = useState(todayISO());
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const [form, setForm] = useState({
        pest_type: "",
        property_type: "",
        address: "",
        notes: "",
    });

    const [loadingSlots, setLoadingSlots] = useState(false);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [savingBooking, setSavingBooking] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [serviceUnavailable, setServiceUnavailable] = useState(false);

    const openModal = !!selectedSlot;

    const upcomingBookings = useMemo(
        () => bookings.slice().sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [bookings]
    );

    const isHistoryBooking = (booking) => {
        const assignmentStatus = booking.assignment_status;
        return (
            booking.status === "cancelled" ||
            assignmentStatus === "done" ||
            assignmentStatus === "completed"
        );
    };

    const activeBookings = useMemo(
        () => upcomingBookings.filter((booking) => !isHistoryBooking(booking)),
        [upcomingBookings]
    );

    const historyBookings = useMemo(
        () => upcomingBookings.filter((booking) => isHistoryBooking(booking)),
        [upcomingBookings]
    );

    const getErrorMessage = (err, fallback) => {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;

        if (status === 404 || detail === "Not Found") {
            setServiceUnavailable(true);
            return "Booking service is currently unavailable. Please refresh or try again in a moment.";
        }

        return detail || fallback;
    };

    const loadSlots = async () => {
        setLoadingSlots(true);
        setError("");
        try {
            setServiceUnavailable(false);
            const res = await getSlotAvailability(serviceDate);
            setSlots(res.data.slots || []);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load slot availability."));
        } finally {
            setLoadingSlots(false);
        }
    };

    const loadBookings = async () => {
        setLoadingBookings(true);
        try {
            setServiceUnavailable(false);
            const res = await getMyBookings();
            setBookings(res.data.bookings || []);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load your bookings."));
        } finally {
            setLoadingBookings(false);
        }
    };

    useEffect(() => {
        if (showNewBooking) {
            loadSlots();
        }
    }, [serviceDate]);

    useEffect(() => {
        if (showMyBookings) {
            loadBookings();
        }
    }, [showMyBookings]);

    const handleSlotClick = (slot) => {
        if (!slot.available) return;
        setSelectedSlot(slot.slot);
        setSuccess("");
        setError("");
    };

    const closeModal = () => {
        setSelectedSlot(null);
    };

    const handleCreateBooking = async (e) => {
        e.preventDefault();
        setSavingBooking(true);
        setError("");
        setSuccess("");

        try {
            await createBooking({
                service_date: serviceDate,
                slot: selectedSlot,
                pest_type: form.pest_type,
                property_type: form.property_type,
                address: form.address,
                notes: form.notes,
            });

            setSuccess("Booking created successfully. You can now confirm or cancel it below.");
            setForm({ pest_type: "", property_type: "", address: "", notes: "" });
            closeModal();
            await loadSlots();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to create booking."));
        } finally {
            setSavingBooking(false);
        }
    };

    const handleConfirm = async (bookingId) => {
        setError("");
        setSuccess("");
        try {
            await confirmBooking(bookingId);
            setSuccess("Booking confirmed.");
            await loadBookings();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to confirm booking."));
        }
    };

    const handleCancel = async (bookingId) => {
        setError("");
        setSuccess("");
        try {
            await cancelBooking(bookingId);
            setSuccess("Booking cancelled.");
            await loadBookings();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to cancel booking."));
        }
    };

    return (
        <div className="space-y-0">
            {/* ── Page Hero Banner ──────────────────────── */}
            <section className="relative bg-primary text-white overflow-hidden pb-12">
                <div className="max-w-7xl mx-auto px-6 py-14">
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                        {view === "new" ? "New Booking" : view === "my" ? "My Bookings" : "Booking"}
                    </h1>
                    <p className="mt-2 text-white/70 text-lg max-w-xl">
                        {view === "new"
                            ? "Check slot availability and create a new booking request."
                            : view === "my"
                                ? "View your booked schedules and manage confirmation/cancellation."
                                : "Check available slots, create bookings, and confirm or cancel requests."}
                    </p>
                </div>
                <div className="absolute bottom-0 left-0 w-full leading-none">
                    <svg viewBox="0 0 1440 200" className="w-full h-auto" preserveAspectRatio="none">
                        <path d="M0,100 C360,200 1080,0 1440,100 L1440,200 L0,200 Z" fill="#F8F9FA" />
                    </svg>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
                {error && <div className="bg-red-50 p-3 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                {success && <div className="bg-green-50 p-3 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

                {serviceUnavailable && (
                    <section className="bg-white shadow-md p-6 border-l-4 border-warning rounded-lg">
                        <h2 className="mb-1 font-semibold text-primary text-lg">Booking Service Unavailable</h2>
                        <p className="mb-3 text-gray-600 text-sm">
                            The booking API endpoint is not reachable right now. Please retry after backend refresh.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                if (showNewBooking) loadSlots();
                                if (showMyBookings) loadBookings();
                            }}
                            className="bg-accent hover:bg-accent-light px-5 py-2 rounded-lg font-semibold text-white transition"
                        >
                            Retry
                        </button>
                    </section>
                )}

                {showNewBooking && !serviceUnavailable && (
                    <section className="space-y-4 bg-white shadow-md p-6 rounded-xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="font-medium text-primary text-sm">Service Date</label>
                            <input
                                type="date"
                                value={serviceDate}
                                onChange={(e) => setServiceDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <button
                                type="button"
                                onClick={loadSlots}
                                className="bg-primary hover:bg-primary-light px-5 py-2 rounded-lg font-semibold text-white transition"
                            >
                                Refresh Slots
                            </button>
                        </div>

                        <div>
                            <h2 className="mb-3 font-bold text-primary text-lg">Slot Availability</h2>
                            {loadingSlots ? (
                                <p className="text-gray-500">Loading slots...</p>
                            ) : (
                                <div className="gap-3 grid grid-cols-2 md:grid-cols-3">
                                    {slots.map((slotItem) => (
                                        <button
                                            key={slotItem.slot}
                                            type="button"
                                            disabled={!slotItem.available}
                                            onClick={() => handleSlotClick(slotItem)}
                                            className={`border rounded-xl p-4 text-left transition ${slotItem.available
                                                ? "border-accent/40 bg-accent/5 hover:bg-accent/10 hover:shadow"
                                                : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                                }`}
                                        >
                                            <p className="font-semibold text-primary">{slotItem.slot}</p>
                                            <p className="mt-1 text-xs">{slotItem.available ? "Available" : "Unavailable"}</p>
                                        </button>
                                    ))}
                                    {!slots.length && <p className="text-gray-500">No slots found for this date.</p>}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {showMyBookings && !serviceUnavailable && (
                    <section className="bg-white shadow-md p-6 rounded-xl">
                        <h2 className="mb-4 font-bold text-primary text-lg">My Bookings</h2>
                        {loadingBookings ? (
                            <p className="text-gray-500">Loading bookings...</p>
                        ) : upcomingBookings.length === 0 ? (
                            <p className="text-gray-500">You have no bookings yet.</p>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="mb-3 font-semibold text-primary text-base flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
                                        Active Bookings
                                    </h3>
                                    {activeBookings.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No active bookings. Completed jobs are moved to booking history.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeBookings.map((booking) => (
                                                <div key={booking.id} className="p-4 border border-gray-200 rounded-xl hover:shadow transition">
                                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                                        <p className="font-semibold text-primary">
                                                            {booking.service_date} · {booking.slot}
                                                        </p>
                                                        <StatusBadge status={booking.status} />
                                                    </div>
                                                    <p className="mt-1 text-gray-600 text-sm">
                                                        {booking.pest_type} · {booking.property_type}
                                                    </p>
                                                    <p className="text-gray-600 text-sm">{booking.address}</p>
                                                    <p className="mt-1 text-gray-600 text-sm">
                                                        Assigned Technician: {booking.assigned_technician_name || "Not yet assigned"}
                                                    </p>
                                                    {booking.assignment_status && (
                                                        <div className="mt-2">
                                                            <span className="mr-2 text-gray-500 text-xs">Job Tracking:</span>
                                                            <StatusBadge status={booking.assignment_status} />
                                                        </div>
                                                    )}
                                                    {booking.notes && <p className="mt-1 text-gray-500 text-sm">Notes: {booking.notes}</p>}
                                                    {booking.initial_findings && (
                                                        <p className="mt-1 text-gray-600 text-sm">Inspection Findings: {booking.initial_findings}</p>
                                                    )}

                                                    <div className="flex gap-2 mt-3">
                                                        {booking.status === "pending" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleConfirm(booking.id)}
                                                                className="bg-accent hover:bg-accent-light px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                                                            >
                                                                Confirm
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancel(booking.id)}
                                                            className="bg-danger hover:opacity-90 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="mb-3 font-semibold text-primary text-base flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                                        Booking History
                                    </h3>
                                    {historyBookings.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No completed or cancelled bookings yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {historyBookings.map((booking) => (
                                                <div key={booking.id} className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                                        <p className="font-semibold text-primary">
                                                            {booking.service_date} · {booking.slot}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <StatusBadge status={booking.status} />
                                                            {booking.assignment_status && <StatusBadge status={booking.assignment_status} />}
                                                        </div>
                                                    </div>
                                                    <p className="mt-1 text-gray-600 text-sm">
                                                        {booking.pest_type} · {booking.property_type}
                                                    </p>
                                                    <p className="text-gray-600 text-sm">{booking.address}</p>
                                                    <p className="mt-1 text-gray-600 text-sm">
                                                        Assigned Technician: {booking.assigned_technician_name || "Not yet assigned"}
                                                    </p>
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
                )}

                {openModal && (
                    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 p-4">
                        <div className="bg-white shadow-xl p-6 rounded-xl w-full max-w-xl">
                            <h3 className="mb-2 font-bold text-primary text-xl">Booking Summary</h3>
                            <p className="mb-4 text-gray-600 text-sm">
                                You selected <span className="font-semibold text-primary">{serviceDate}</span> at <span className="font-semibold text-primary">{selectedSlot}</span>.
                            </p>

                            <form className="space-y-3" onSubmit={handleCreateBooking}>
                                <div>
                                    <label className="block mb-1 font-medium text-primary text-sm">Pest Type</label>
                                    <input
                                        required
                                        value={form.pest_type}
                                        onChange={(e) => setForm((prev) => ({ ...prev, pest_type: e.target.value }))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1 font-medium text-primary text-sm">Property Type</label>
                                    <input
                                        required
                                        value={form.property_type}
                                        onChange={(e) => setForm((prev) => ({ ...prev, property_type: e.target.value }))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1 font-medium text-primary text-sm">Address</label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={form.address}
                                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1 font-medium text-primary text-sm">Notes (optional)</label>
                                    <textarea
                                        rows={2}
                                        value={form.notes}
                                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="hover:bg-gray-50 px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium transition"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingBooking}
                                        className="bg-accent hover:bg-accent-light disabled:opacity-60 px-5 py-2 rounded-lg text-white font-semibold transition"
                                    >
                                        {savingBooking ? "Creating..." : "Create Booking"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
