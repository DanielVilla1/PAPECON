/**
 * Sidebar navigation links per role.
 * Each entry: { label, path, icon? }
 */
const ROLE_NAV = {
  ceo: [
    { label: "Dashboard", path: "/ceo/dashboard" },
    { label: "User Management", path: "/ceo/users" },
    { label: "Client Management", path: "/ceo/clients" },
    { label: "Analytics", path: "/ceo/analytics" },
  ],
  operations: [
    { label: "Dashboard", path: "/operations/dashboard" },
    { label: "Inventory", path: "/operations/inventory" },
    { label: "Service Routes", path: "/operations/routes" },
    { label: "Job Status", path: "/operations/jobs" },
    { label: "Booking Management", path: "/operations/bookings" },
  ],
  finance: [
    { label: "Dashboard", path: "/finance/dashboard" },
    { label: "Financial Reports", path: "/finance/reports" },
    { label: "Payroll", path: "/finance/payroll" },
    { label: "Payment Tracking", path: "/finance/payments" },
    { label: "BIR Compliance", path: "/finance/compliance" },
  ],
  technical: [
    { label: "Dashboard", path: "/technical/dashboard" },
    { label: "Field Reports", path: "/technical/field-reports" },
    { label: "Outbreak Alerts", path: "/technical/outbreak-alerts" },
    { label: "Treatment Protocols", path: "/technical/protocols" },
    { label: "Service Quality", path: "/technical/quality" },
  ],
  hr: [
    { label: "Dashboard", path: "/hr/dashboard" },
    { label: "Employee Roster", path: "/hr/employees" },
    { label: "Training", path: "/hr/training" },
    { label: "Attendance", path: "/hr/attendance" },
  ],
  technician: [
    { label: "Dashboard", path: "/technician/dashboard" },
    { label: "My Assignments", path: "/technician/assignments" },
    { label: "Field Report", path: "/technician/field-report" },
  ],
  csr: [
    { label: "Dashboard", path: "/csr/dashboard" },
    { label: "Inquiries", path: "/csr/inquiries" },
    { label: "Booking Management", path: "/csr/bookings" },
    { label: "Quotation", path: "/csr/quotation" },
    { label: "Job Status Updates", path: "/csr/job-status" },
  ],
  client: [
    { label: "Home", path: "/client/dashboard" },
    { label: "New Booking", path: "/client/book" },
    { label: "My Bookings", path: "/client/bookings" },
    { label: "Job Status", path: "/client/job-status" },
    { label: "Payment", path: "/client/payment" },
    { label: "Feedback", path: "/client/feedback" },
  ],
  developer: [
    { label: "Dashboard", path: "/developer/dashboard" },
    { label: "System Logs", path: "/developer/logs" },
    { label: "API Health", path: "/developer/health" },
    { label: "Prophet Config", path: "/developer/prophet" },
    { label: "Integrations", path: "/developer/integrations" },
  ],
};

export default ROLE_NAV;
