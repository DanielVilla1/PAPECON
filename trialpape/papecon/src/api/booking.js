import API from "./axiosInstance";

export const getSlotAvailability = (serviceDate) =>
  API.get("/bookings/slots", { params: { service_date: serviceDate } });

export const getMyBookings = () => API.get("/bookings");

export const createBooking = (payload) => API.post("/bookings", payload);

export const confirmBooking = (bookingId) => API.post(`/bookings/${bookingId}/confirm`);

export const cancelBooking = (bookingId) => API.post(`/bookings/${bookingId}/cancel`);
