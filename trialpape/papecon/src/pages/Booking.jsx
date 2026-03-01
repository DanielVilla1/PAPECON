import { useEffect, useMemo, useState } from "react";
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
    getSlotAvailability,
    getMyBookings,
    createBooking,
    confirmBooking,
    cancelBooking,
} from "../api/booking";

const CANCELLATION_REASONS = [
    { value: "schedule_conflict", label: "Schedule conflict" },
    { value: "price_concern", label: "Price concern" },
    { value: "service_no_longer_needed", label: "Service no longer needed" },
    { value: "booked_by_mistake", label: "Booked by mistake" },
    { value: "location_unavailable", label: "Location unavailable" },
    { value: "other", label: "Other" },
];

const MAP_LIBRARIES = ["places"];
const DEFAULT_MAP_CENTER = { lat: 14.5995, lng: 120.9842 };
const RUNTIME_MAPS_KEY_STORAGE = "PAPECON_GOOGLE_MAPS_API_KEY";

function GoogleAddressPicker({ address, onAddressChange, apiKey }) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: `booking-address-map-script-${(apiKey || "none").slice(-6)}`,
        googleMapsApiKey: apiKey,
        libraries: MAP_LIBRARIES,
    });

    const [autocomplete, setAutocomplete] = useState(null);
    const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
    const [markerPosition, setMarkerPosition] = useState(null);

    const updateAddressFromCoordinates = (lat, lng) => {
        if (!window.google?.maps) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results?.[0]?.formatted_address) {
                onAddressChange(results[0].formatted_address);
            }
        });
    };

    const handlePlaceChanged = () => {
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
        if (place?.formatted_address) {
            onAddressChange(place.formatted_address);
        }
        if (place?.geometry?.location) {
            const nextPosition = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
            };
            setMapCenter(nextPosition);
            setMarkerPosition(nextPosition);
        }
    };

    const handleMapClick = (event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (typeof lat !== "number" || typeof lng !== "number") return;

        const selectedPosition = { lat, lng };
        setMapCenter(selectedPosition);
        setMarkerPosition(selectedPosition);
        updateAddressFromCoordinates(lat, lng);
    };

    if (loadError) {
        return (
            <div className="space-y-2">
                <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => onAddressChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                    placeholder="Enter service address"
                />
                <p className="text-amber-700 text-xs">Google Maps could not be loaded. You can still enter the address manually.</p>
            </div>
        );
    }

    if (!isLoaded) {
        return <p className="text-gray-500 text-sm">Loading Google Maps...</p>;
    }

    return (
        <div className="space-y-2">
            <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceChanged}>
                <input
                    required
                    value={address}
                    onChange={(e) => onAddressChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                    placeholder="Search address via Google Maps"
                />
            </Autocomplete>

            <GoogleMap
                mapContainerStyle={{ width: "100%", height: "220px", borderRadius: "8px" }}
                center={mapCenter}
                zoom={markerPosition ? 16 : 12}
                onClick={handleMapClick}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
                {markerPosition && <Marker position={markerPosition} />}
            </GoogleMap>
            <p className="text-gray-500 text-xs">Tip: search an address or click on the map to auto-fill the booking address.</p>
        </div>
    );
}

function todayISO() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().split("T")[0];
}

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
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReasonCode, setCancelReasonCode] = useState("schedule_conflict");
    const [cancelReasonDetails, setCancelReasonDetails] = useState("");
    const [cancelSaving, setCancelSaving] = useState(false);
    const [googleMapsApiKeyInput, setGoogleMapsApiKeyInput] = useState("");
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState(() => {
        const buildTimeKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (buildTimeKey) return buildTimeKey;
        if (typeof window === "undefined") return "";
        return window.localStorage.getItem(RUNTIME_MAPS_KEY_STORAGE) || "";
    });
    const hasGoogleMapsKey = Boolean(googleMapsApiKey);

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

    const handleCancel = async () => {
        if (!cancelTarget) return;
        setError("");
        setSuccess("");
        setCancelSaving(true);
        try {
            await cancelBooking(cancelTarget.id, {
                reason_code: cancelReasonCode,
                reason_details: cancelReasonDetails?.trim() || null,
            });
            setSuccess("Booking cancelled.");
            await loadBookings();
            closeCancelModal();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to cancel booking."));
        } finally {
            setCancelSaving(false);
        }
    };

    const enableGoogleMaps = () => {
        const nextKey = googleMapsApiKeyInput.trim();
        if (!nextKey) {
            setError("Please enter a valid Google Maps API key.");
            return;
        }

        setGoogleMapsApiKey(nextKey);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(RUNTIME_MAPS_KEY_STORAGE, nextKey);
        }
        setError("");
        setSuccess("Google Maps address selector enabled for this browser.");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-1 font-bold text-neutral-900 text-2xl">
                    {view === "new" ? "New Booking" : view === "my" ? "My Bookings" : "Booking"}
                </h1>
                <p className="text-gray-600">
                    {view === "new"
                        ? "Check slot availability and create a new booking request."
                        : view === "my"
                            ? "View your booked schedules and manage confirmation/cancellation."
                            : "Check available slots, create bookings, and confirm or cancel requests."}
                </p>
            </div>

            {error && <div className="bg-red-50 p-3 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
            {success && <div className="bg-green-50 p-3 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

            {serviceUnavailable && (
                <section className="bg-white shadow p-5 border border-yellow-200 rounded-lg">
                    <h2 className="mb-1 font-semibold text-neutral-900 text-lg">Booking Service Unavailable</h2>
                    <p className="mb-3 text-gray-600 text-sm">
                        The booking API endpoint is not reachable right now. Please retry after backend refresh.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (showNewBooking) loadSlots();
                            if (showMyBookings) loadBookings();
                        }}
                        className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                    >
                        Retry
                    </button>
                </section>
            )}

            {showNewBooking && !serviceUnavailable && (
                <section className="space-y-4 bg-white shadow p-5 rounded-lg">
                    <div className="flex items-center gap-3">
                        <label className="font-medium text-gray-700 text-sm">Service Date</label>
                        <input
                            type="date"
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={loadSlots}
                            className="bg-primary hover:bg-primary/90 px-4 py-2 rounded font-medium text-white"
                        >
                            Refresh Slots
                        </button>
                    </div>

                    <div>
                        <h2 className="mb-3 font-semibold text-neutral-900 text-lg">Slot Availability</h2>
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
                                        className={`border rounded p-3 text-left transition ${slotItem.available
                                            ? "border-green-300 bg-green-50 hover:bg-green-100"
                                            : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                    >
                                        <p className="font-semibold">{slotItem.slot}</p>
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
                <section className="bg-white shadow p-5 rounded-lg">
                    <h2 className="mb-3 font-semibold text-neutral-900 text-lg">My Bookings</h2>
                    {loadingBookings ? (
                        <p className="text-gray-500">Loading bookings...</p>
                    ) : upcomingBookings.length === 0 ? (
                        <p className="text-gray-500">You have no bookings yet.</p>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-2 font-semibold text-neutral-900 text-base">Active Bookings</h3>
                                {activeBookings.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No active bookings. Completed jobs are moved to booking history.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {activeBookings.map((booking) => (
                                            <div key={booking.id} className="p-4 border border-gray-200 rounded">
                                                <div className="flex flex-wrap justify-between items-center gap-2">
                                                    <p className="font-semibold text-neutral-900">
                                                        {booking.service_date} · {booking.slot}
                                                    </p>
                                                    <StatusBadge status={booking.status} />
                                                </div>
                                                <p className="mt-1 text-gray-600 text-sm">
                                                    {booking.pest_type} · {booking.property_type}
                                                </p>
                                                <p className="text-gray-600 text-sm">{booking.address}</p>
                                                <p className="text-gray-600 text-sm">Appointment Type: {booking.appointment_type || "inspection"}</p>
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
                                                            className="bg-primary hover:bg-primary/90 px-3 py-2 rounded text-white text-sm"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openCancelModal(booking)}
                                                        className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-sm"
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
                                <h3 className="mb-2 font-semibold text-neutral-900 text-base">Booking History</h3>
                                {historyBookings.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No completed or cancelled bookings yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {historyBookings.map((booking) => (
                                            <div key={booking.id} className="bg-gray-50 p-4 border border-gray-200 rounded">
                                                <div className="flex flex-wrap justify-between items-center gap-2">
                                                    <p className="font-semibold text-neutral-900">
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
                                                <p className="text-gray-600 text-sm">Appointment Type: {booking.appointment_type || "inspection"}</p>
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
                    <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-xl">
                        <h3 className="mb-2 font-bold text-neutral-900 text-xl">Booking Summary</h3>
                        <p className="mb-4 text-gray-600 text-sm">
                            You selected <span className="font-semibold">{serviceDate}</span> at <span className="font-semibold">{selectedSlot}</span>.
                        </p>

                        <form className="space-y-3" onSubmit={handleCreateBooking}>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Pest Type</label>
                                <input
                                    required
                                    value={form.pest_type}
                                    onChange={(e) => setForm((prev) => ({ ...prev, pest_type: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Property Type</label>
                                <input
                                    required
                                    value={form.property_type}
                                    onChange={(e) => setForm((prev) => ({ ...prev, property_type: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Address</label>
                                {hasGoogleMapsKey ? (
                                    <GoogleAddressPicker
                                        address={form.address}
                                        apiKey={googleMapsApiKey}
                                        onAddressChange={(nextAddress) =>
                                            setForm((prev) => ({ ...prev, address: nextAddress }))
                                        }
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        <textarea
                                            required
                                            rows={2}
                                            value={form.address}
                                            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                                        />
                                        <p className="text-amber-700 text-xs">
                                            Google Maps API key is not configured. Paste your browser key below to enable address selection now.
                                        </p>
                                        <div className="flex sm:flex-row flex-col items-stretch sm:items-end gap-2">
                                            <div className="flex-1">
                                                <label className="block mb-1 text-gray-600 text-xs">Google Maps API Key</label>
                                                <input
                                                    type="text"
                                                    value={googleMapsApiKeyInput}
                                                    onChange={(e) => setGoogleMapsApiKeyInput(e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded w-full"
                                                    placeholder="Paste browser key with Maps JavaScript API + Places API"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={enableGoogleMaps}
                                                className="bg-primary hover:bg-primary/90 px-4 py-2 rounded text-white"
                                            >
                                                Enable Maps
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Notes (optional)</label>
                                <textarea
                                    rows={2}
                                    value={form.notes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded text-gray-700"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingBooking}
                                    className="bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-2 rounded text-white"
                                >
                                    {savingBooking ? "Creating..." : "Create Booking"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {cancelTarget && (
                <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 p-4">
                    <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-lg">
                        <h3 className="mb-2 font-bold text-neutral-900 text-xl">Cancel Booking</h3>
                        <p className="mb-4 text-gray-600 text-sm">
                            Please select a cancellation reason for <span className="font-semibold">{cancelTarget.service_date} · {cancelTarget.slot}</span>.
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
                                onClick={handleCancel}
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
