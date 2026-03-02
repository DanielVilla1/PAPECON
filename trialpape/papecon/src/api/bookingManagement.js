import API from "./axiosInstance";

export const getManagedBookings = () => API.get("/booking-management/bookings");

export const getTechniciansForAssignment = () => API.get("/booking-management/technicians");

export const getManagementSlotAvailability = (serviceDate) =>
  API.get("/booking-management/slots", { params: { service_date: serviceDate } });

export const assignTechnicianToBooking = (bookingId, technicianUserId) =>
  API.post(`/booking-management/bookings/${bookingId}/assign`, {
    technician_user_id: technicianUserId,
  });

export const confirmManagedBooking = (bookingId) =>
  API.post(`/booking-management/bookings/${bookingId}/confirm`);

export const cancelManagedBooking = (bookingId, payload) =>
  API.post(`/booking-management/bookings/${bookingId}/cancel`, payload);

export const rescheduleManagedBooking = (bookingId, payload) =>
  API.post(`/booking-management/bookings/${bookingId}/reschedule`, payload);
