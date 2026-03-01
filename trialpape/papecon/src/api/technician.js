import API from "./axiosInstance";

export const getMyAssignments = (includeDone = false) =>
	API.get("/technician/assignments", {
		params: includeDone ? { include_done: true } : undefined,
	});

export const logInitialFindings = (bookingId, findings) =>
	API.post(`/technician/assignments/${bookingId}/findings`, { findings });

export const updateTechnicianJobStatus = (bookingId, status) =>
	API.post(`/technician/assignments/${bookingId}/status`, { status });
