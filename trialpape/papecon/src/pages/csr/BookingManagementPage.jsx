import { useEffect, useMemo, useState } from "react";
import {
    getManagedBookings,
    getTechniciansForAssignment,
    assignTechnicianToBooking,
    confirmManagedBooking,
    cancelManagedBooking,
} from "../../api/bookingManagement";
import useAuth from "../../hooks/useAuth";
import { canAccessFeature } from "../../config/rbacMap";

function StatusBadge({ status }) {
    const map = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
            {status}
        </span>
    );
}

export default function BookingManagementPage() {
    const { role } = useAuth();
    const canManage = canAccessFeature(role, "booking.management");
    const canAssign = canAccessFeature(role, "booking.assign_technician");

    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechByBooking, setSelectedTechByBooking] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const sorted = useMemo(
        () => bookings.slice().sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`)),
        [bookings]
    );

    const loadBookings = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getManagedBookings();
            setBookings(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load bookings.");
        } finally {
            setLoading(false);
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
        loadBookings();
        if (canAssign) {
            loadTechnicians();
        }
    }, []);

    useEffect(() => {
        const next = {};
        for (const booking of bookings) {
            next[booking.id] = booking.assigned_technician_user_id || "";
        }
        setSelectedTechByBooking(next);
    }, [bookings]);

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

    const cancelBooking = async (bookingId) => {
        setError("");
        setSuccess("");
        try {
            await cancelManagedBooking(bookingId);
            setSuccess("Booking cancelled.");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to cancel booking.");
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Booking Management</h1>
                    <p className="text-gray-600">Role-based booking workflow: review bookings, assign technician, and update status.</p>
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
                    <div className="space-y-3">
                        {sorted.map((booking) => (
                            <div key={booking.id} className="p-4 border border-gray-200 rounded">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <p className="font-semibold text-neutral-900">
                                        #{booking.id} · {booking.service_date} · {booking.slot}
                                    </p>
                                    <StatusBadge status={booking.status} />
                                </div>

                                <p className="mt-1 text-gray-600 text-sm">Client ID: {booking.user_id}</p>
                                <p className="text-gray-600 text-sm">{booking.pest_type} · {booking.property_type}</p>
                                <p className="text-gray-600 text-sm">{booking.address}</p>
                                {booking.notes && <p className="mt-1 text-gray-500 text-sm">Notes: {booking.notes}</p>}
                                <div className="mt-1 text-gray-600 text-sm">
                                    Assigned Technician: {booking.assigned_technician_name || "Not yet assigned"}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {canAssign && booking.status !== "cancelled" && (
                                        <>
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
                                            <button
                                                type="button"
                                                onClick={() => assignTechnician(booking.id)}
                                                className="bg-accent hover:bg-accent/90 px-3 py-2 rounded text-white text-sm"
                                            >
                                                Assign Technician
                                            </button>
                                        </>
                                    )}
                                    {canManage && booking.status === "pending" && (
                                        <button
                                            type="button"
                                            onClick={() => confirmBooking(booking.id)}
                                            className="bg-primary hover:bg-primary/90 px-3 py-2 rounded text-white text-sm"
                                        >
                                            Confirm
                                        </button>
                                    )}
                                    {canManage && booking.status !== "cancelled" && (
                                        <button
                                            type="button"
                                            onClick={() => cancelBooking(booking.id)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-sm"
                                        >
                                            Cancel
                                        </button>
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
