import API from "./axiosInstance";

export const getManagedBookings = () => API.get("/booking-management/bookings");

export const getTechniciansForAssignment = () => API.get("/booking-management/technicians");

export const assignTechnicianToBooking = (bookingId, technicianUserId) =>
  API.post(`/booking-management/bookings/${bookingId}/assign`, {
    technician_user_id: technicianUserId,
  });

export const confirmManagedBooking = (bookingId) =>
  API.post(`/booking-management/bookings/${bookingId}/confirm`);

export const cancelManagedBooking = (bookingId) =>
  API.post(`/booking-management/bookings/${bookingId}/cancel`);
