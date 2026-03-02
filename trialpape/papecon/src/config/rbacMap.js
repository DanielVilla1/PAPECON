export const FEATURE_RBAC = {
  "management.user_account_management": ["ceo"],
  "management.formulate_pest_control_packages": ["ceo"],
  "finance.confirm_payments": ["ceo", "finance"],
  "finance.basic_audit_logging": ["ceo", "finance", "developer"],
  "analytics.executive_dashboard": ["ceo"],
  "analytics.package_and_price_insights": ["ceo"],

  "inventory.manage_resources": ["operations"],
  "service.plan_routes": ["operations"],
  "service.schedule_and_track_technicians": ["operations", "csr"],

  "finance.prepare_financial_reports": ["finance", "ceo"],
  "finance.manage_payroll": ["finance", "hr"],
  "finance.ensure_compliance": ["finance"],

  "decision.review_customer_ratings": ["technical", "ceo"],
  "decision.formulate_optimal_treatments": ["technical"],

  "hr.manage_employees": ["hr"],
  "hr.manage_hierarchy": ["hr"],
  "hr.organize_training": ["hr"],

  "technician.log_initial_inspection": ["technician"],
  "technician.update_job_status": ["technician"],
  "technician.track_treatments": ["technician"],

  "csr.handle_inquiries": ["csr"],
  "csr.schedule_appointments": ["csr", "operations"],
  "csr.maintain_client_satisfaction": ["csr"],

  "client.create_and_access_accounts": ["client"],
  "client.inquire_and_request_bookings": ["client"],
  "client.track_job_status": ["client"],

  "developer.manage_system_architecture": ["developer"],
  "developer.manage_integrations": ["developer"],
  "developer.maintain_prophet_engine": ["developer"],
  "developer.view_technical_logs_and_health": ["developer", "ceo"],

  "booking.client_self_service": ["client"],
  "booking.management": ["operations", "csr"],
  "booking.schedule_appointments": ["operations", "csr"],
  "booking.assign_technician": ["operations"],
  "booking.technician_portal": ["technician"],
};

export function canAccessFeature(role, featureKey) {
  if (!role || !featureKey) return false;
  const allowed = FEATURE_RBAC[featureKey] || [];
  return allowed.includes(role);
}
