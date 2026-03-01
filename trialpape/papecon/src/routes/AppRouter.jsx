import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// Layouts
import CEOLayout from "../layouts/CEOLayout";
import OperationsLayout from "../layouts/OperationsLayout";
import FinanceLayout from "../layouts/FinanceLayout";
import TechnicalLayout from "../layouts/TechnicalLayout";
import HRLayout from "../layouts/HRLayout";
import TechnicianLayout from "../layouts/TechnicianLayout";
import CSRLayout from "../layouts/CSRLayout";
import ClientLayout from "../layouts/ClientLayout";
import DeveloperLayout from "../layouts/DeveloperLayout";

// Public pages
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";

// ── CEO pages ────────────────────────────────────────
import CEODashboard from "../pages/ceo/CEODashboard";
import UserManagementPage from "../pages/ceo/UserManagementPage";
import ClientManagementPage from "../pages/ceo/ClientManagementPage";
import AnalyticsPage from "../pages/ceo/AnalyticsPage";

// ── Operations pages ─────────────────────────────────
import OperationsDashboard from "../pages/operations/OperationsDashboard";
import InventoryPage from "../pages/operations/InventoryPage";
import ServiceRoutesPage from "../pages/operations/ServiceRoutesPage";
import OpsJobStatusPage from "../pages/operations/JobStatusPage";

// ── Finance pages ────────────────────────────────────
import FinanceDashboard from "../pages/finance/FinanceDashboard";
import FinancialReportsPage from "../pages/finance/FinancialReportsPage";
import PayrollPage from "../pages/finance/PayrollPage";
import PaymentTrackingPage from "../pages/finance/PaymentTrackingPage";
import BIRCompliancePage from "../pages/finance/BIRCompliancePage";

// ── Technical pages ──────────────────────────────────
import TechnicalDashboard from "../pages/technical/TechnicalDashboard";
import FieldReportsPage from "../pages/technical/FieldReportsPage";
import OutbreakAlertsPage from "../pages/technical/OutbreakAlertsPage";
import TreatmentProtocolsPage from "../pages/technical/TreatmentProtocolsPage";
import ServiceQualityPage from "../pages/technical/ServiceQualityPage";

// ── HR pages ─────────────────────────────────────────
import HRDashboard from "../pages/hr/HRDashboard";
import EmployeeRosterPage from "../pages/hr/EmployeeRosterPage";
import TrainingPage from "../pages/hr/TrainingPage";
import AttendancePage from "../pages/hr/AttendancePage";

// ── Technician pages ─────────────────────────────────
import TechnicianDashboard from "../pages/technician/TechnicianDashboard";
import AssignmentsPage from "../pages/technician/AssignmentsPage";
import FieldReportFormPage from "../pages/technician/FieldReportFormPage";

// ── CSR pages ────────────────────────────────────────
import CSRDashboard from "../pages/csr/CSRDashboard";
import InquiriesPage from "../pages/csr/InquiriesPage";
import BookingManagementPage from "../pages/csr/BookingManagementPage";
import QuotationPage from "../pages/csr/QuotationPage";
import JobStatusUpdatePage from "../pages/csr/JobStatusUpdatePage";

// ── Client pages ─────────────────────────────────────
import ClientDashboard from "../pages/client/ClientDashboard";
import NewBookingPage from "../pages/client/NewBookingPage";
import MyBookingsPage from "../pages/client/MyBookingsPage";
import ClientJobStatusPage from "../pages/client/ClientJobStatusPage";
import PaymentPage from "../pages/client/PaymentPage";
import FeedbackPage from "../pages/client/FeedbackPage";

// ── Developer pages ──────────────────────────────────
import DeveloperDashboard from "../pages/developer/DeveloperDashboard";
import SystemLogsPage from "../pages/developer/SystemLogsPage";
import APIHealthPage from "../pages/developer/APIHealthPage";
import ProphetConfigPage from "../pages/developer/ProphetConfigPage";
import IntegrationsPage from "../pages/developer/IntegrationsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ─────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── CEO (/ceo) ────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["ceo"]} />}>
            <Route element={<CEOLayout />}>
              <Route path="/ceo/dashboard" element={<CEODashboard />} />
              <Route path="/ceo/users" element={<UserManagementPage />} />
              <Route path="/ceo/clients" element={<ClientManagementPage />} />
              <Route path="/ceo/analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>

          {/* ── Operations Manager (/operations) ──────── */}
          <Route element={<ProtectedRoute allowedRoles={["operations"]} />}>
            <Route element={<OperationsLayout />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
              <Route path="/operations/inventory" element={<InventoryPage />} />
              <Route path="/operations/routes" element={<ServiceRoutesPage />} />
              <Route path="/operations/jobs" element={<OpsJobStatusPage />} />
              <Route path="/operations/bookings" element={<BookingManagementPage />} />
            </Route>
          </Route>

          {/* ── Finance & Admin Manager (/finance) ────── */}
          <Route element={<ProtectedRoute allowedRoles={["finance"]} />}>
            <Route element={<FinanceLayout />}>
              <Route path="/finance/dashboard" element={<FinanceDashboard />} />
              <Route path="/finance/reports" element={<FinancialReportsPage />} />
              <Route path="/finance/payroll" element={<PayrollPage />} />
              <Route path="/finance/payments" element={<PaymentTrackingPage />} />
              <Route path="/finance/compliance" element={<BIRCompliancePage />} />
            </Route>
          </Route>

          {/* ── Technical Supervisor (/technical) ─────── */}
          <Route element={<ProtectedRoute allowedRoles={["technical"]} />}>
            <Route element={<TechnicalLayout />}>
              <Route path="/technical/dashboard" element={<TechnicalDashboard />} />
              <Route path="/technical/field-reports" element={<FieldReportsPage />} />
              <Route path="/technical/outbreak-alerts" element={<OutbreakAlertsPage />} />
              <Route path="/technical/protocols" element={<TreatmentProtocolsPage />} />
              <Route path="/technical/quality" element={<ServiceQualityPage />} />
            </Route>
          </Route>

          {/* ── HR Manager (/hr) ──────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["hr"]} />}>
            <Route element={<HRLayout />}>
              <Route path="/hr/dashboard" element={<HRDashboard />} />
              <Route path="/hr/employees" element={<EmployeeRosterPage />} />
              <Route path="/hr/training" element={<TrainingPage />} />
              <Route path="/hr/attendance" element={<AttendancePage />} />
            </Route>
          </Route>

          {/* ── Field Technician (/technician) ────────── */}
          <Route element={<ProtectedRoute allowedRoles={["technician"]} />}>
            <Route element={<TechnicianLayout />}>
              <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
              <Route path="/technician/assignments" element={<AssignmentsPage />} />
              <Route path="/technician/field-report" element={<FieldReportFormPage />} />
            </Route>
          </Route>

          {/* ── Customer Service Rep (/csr) ───────────── */}
          <Route element={<ProtectedRoute allowedRoles={["csr"]} />}>
            <Route element={<CSRLayout />}>
              <Route path="/csr/dashboard" element={<CSRDashboard />} />
              <Route path="/csr/inquiries" element={<InquiriesPage />} />
              <Route path="/csr/bookings" element={<BookingManagementPage />} />
              <Route path="/csr/quotation" element={<QuotationPage />} />
              <Route path="/csr/job-status" element={<JobStatusUpdatePage />} />
            </Route>
          </Route>

          {/* ── Client Portal (/client) ───────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
            <Route element={<ClientLayout />}>
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/book" element={<NewBookingPage />} />
              <Route path="/client/bookings" element={<MyBookingsPage />} />
              <Route path="/client/job-status" element={<ClientJobStatusPage />} />
              <Route path="/client/payment" element={<PaymentPage />} />
              <Route path="/client/feedback" element={<FeedbackPage />} />
            </Route>
          </Route>

          {/* ── Developer Panel (/developer) ──────────── */}
          <Route element={<ProtectedRoute allowedRoles={["developer"]} />}>
            <Route element={<DeveloperLayout />}>
              <Route path="/developer/dashboard" element={<DeveloperDashboard />} />
              <Route path="/developer/logs" element={<SystemLogsPage />} />
              <Route path="/developer/health" element={<APIHealthPage />} />
              <Route path="/developer/prophet" element={<ProphetConfigPage />} />
              <Route path="/developer/integrations" element={<IntegrationsPage />} />
            </Route>
          </Route>

          {/* ── Fallbacks ─────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
