/**
 * Format a Date object or ISO string into a readable date.
 * @param {string|Date} date
 * @returns {string} e.g. "Feb 28, 2026"
 */
export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Date into a readable date-time string.
 * @param {string|Date} date
 * @returns {string} e.g. "Feb 28, 2026, 2:30 PM"
 */
export function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a number as Philippine Peso (PHP) currency.
 * @param {number} amount
 * @returns {string} e.g. "₱1,500.00"
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
