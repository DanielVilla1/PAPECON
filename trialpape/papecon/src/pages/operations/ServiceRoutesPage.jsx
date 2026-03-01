import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getManagedBookings } from "../../api/bookingManagement";
import useAuth from "../../hooks/useAuth";
import { canAccessFeature } from "../../config/rbacMap";

function slotToStartEnd(serviceDate, slot) {
    const [startTime, endTime] = (slot || "09:00-10:00").split("-");
    return {
        start: `${serviceDate}T${startTime}:00`,
        end: `${serviceDate}T${endTime}:00`,
    };
}

export default function ServiceRoutesPage() {
    const { role } = useAuth();
    const canViewRoutes = canAccessFeature(role, "service.plan_routes");
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadBookings = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getManagedBookings();
            setBookings(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load service routes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canViewRoutes) {
            loadBookings();
        }
    }, [canViewRoutes]);

    const events = useMemo(
        () =>
            bookings.map((booking) => {
                const { start, end } = slotToStartEnd(booking.service_date, booking.slot);
                return {
                    id: String(booking.id),
                    title: `${booking.assigned_technician_name || "Unassigned"} • ${booking.address}`,
                    start,
                    end,
                    extendedProps: booking,
                };
            }),
        [bookings]
    );

    const selectedDayRoutes = useMemo(() => {
        return bookings
            .filter((booking) => booking.service_date === selectedDate)
            .sort((a, b) => `${a.service_date} ${a.slot}`.localeCompare(`${b.service_date} ${b.slot}`));
    }, [bookings, selectedDate]);

    if (!canViewRoutes) {
        return (
            <div className="bg-white shadow p-6 rounded-lg">
                <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Service Routes</h1>
                <p className="text-gray-600">You do not have permission to view service route planning.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
                <div>
                    <h1 className="mb-1 font-bold text-neutral-900 text-2xl">Service Routes</h1>
                    <p className="text-gray-600">Calendar view of assigned and upcoming service routes.</p>
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

            <section className="bg-white shadow p-4 rounded-lg">
                {loading ? (
                    <p className="text-gray-500">Loading service routes...</p>
                ) : (
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        height="auto"
                        events={events}
                        dateClick={(arg) => setSelectedDate(arg.dateStr.slice(0, 10))}
                        eventClick={(arg) => setSelectedDate(arg.event.startStr.slice(0, 10))}
                    />
                )}
            </section>

            <section className="bg-white shadow p-5 rounded-lg">
                <div className="flex justify-between items-center gap-2 mb-3">
                    <h2 className="font-semibold text-neutral-900 text-lg">Daily Route Details</h2>
                    <span className="text-gray-600 text-sm">Date: {selectedDate}</span>
                </div>

                {selectedDayRoutes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No service routes scheduled for this date.</p>
                ) : (
                    <div className="space-y-3">
                        {selectedDayRoutes.map((booking) => (
                            <div key={booking.id} className="p-3 border border-gray-200 rounded">
                                <p className="font-semibold text-neutral-900 text-sm">#{booking.id} · {booking.slot}</p>
                                <p className="text-gray-600 text-sm">Technician: {booking.assigned_technician_name || "Unassigned"}</p>
                                <p className="text-gray-600 text-sm">Address: {booking.address}</p>
                                <p className="text-gray-600 text-sm">Service: {booking.pest_type} · {booking.property_type}</p>
                                <p className="text-gray-600 text-sm">Booking Status: {booking.status}</p>
                                <p className="text-gray-600 text-sm">Job Progress: {booking.assignment_status || "Not started"}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
