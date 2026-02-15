/**
 * Date utilities for Pakistan Standard Time (PKT) - UTC+5
 * All date operations should use these utilities to ensure consistency
 */

const PK_TIMEZONE_OFFSET = 5 * 60 * 60 * 1000; // UTC+5 in milliseconds

/**
 * Get current date in PK timezone as YYYY-MM-DD string
 */
export function getTodayPK() {
  const now = new Date();
  const pkTime = new Date(now.getTime() + PK_TIMEZONE_OFFSET);
  const year = pkTime.getUTCFullYear();
  const month = String(pkTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pkTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert YYYY-MM-DD string to Date object in PK timezone
 * Returns a Date object representing the start of that day in PK timezone
 */
export function parseDatePK(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in local timezone (assuming server runs in PK timezone)
  // If server is in UTC, we need to adjust
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get start of day in PK timezone for a given date string (YYYY-MM-DD)
 */
export function getStartOfDayPK(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get end of day in PK timezone for a given date string (YYYY-MM-DD)
 */
export function getEndOfDayPK(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Get date key (YYYY-MM-DD) from a Date object using PK timezone
 */
export function getDateKeyPK(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of today in PK timezone
 */
export function getStartOfTodayPK() {
  const today = getTodayPK();
  return getStartOfDayPK(today);
}

/**
 * Get start of current month in PK timezone
 */
export function getStartOfMonthPK() {
  const today = getTodayPK();
  const [year, month] = today.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Get start of month for YYYY-MM string (e.g. 2026-01)
 */
export function getStartOfMonthFor(yearMonthStr) {
  const [year, month] = yearMonthStr.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Get end of month for YYYY-MM string (e.g. 2026-01 -> Jan 31 23:59:59)
 */
export function getEndOfMonthFor(yearMonthStr) {
  const [year, month] = yearMonthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return getEndOfDayPK(lastDayStr);
}

/**
 * Number of full days from saleDate to referenceDate (referenceDate - saleDate).
 * Used for "days exceeded" since sale. Returns 0 if sale is after reference.
 */
export function getDaysExceeded(saleDate, referenceDateStr) {
  const refStart = getStartOfDayPK(referenceDateStr);
  const saleKey = getDateKeyPK(saleDate);
  const saleStart = getStartOfDayPK(saleKey);
  const diffMs = refStart.getTime() - saleStart.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

/**
 * Format date for display in PK timezone
 */
export function formatDatePK(date, options = {}) {
  const d = new Date(date);
  // Use en-US locale with PK timezone, or use local if server is in PK timezone
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Karachi',
      ...options,
    });
  } catch (e) {
    // Fallback to local date formatting if timezone not supported
    return d.toLocaleDateString(undefined, options);
  }
}
