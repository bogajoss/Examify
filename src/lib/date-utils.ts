import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/bn-bd";

// Extend dayjs with plugins
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(utc);

// Set default locale to Bangla (Bangladesh) if the app is primarily in Bangla
// dayjs.locale('bn-bd');

export type DateInput = string | number | Date | dayjs.Dayjs | null | undefined;

/**
 * Format a date to a standard readable string.
 * Uses 'bn-bd' locale for localized output if specified, otherwise English.
 * We use .utc() to ensure the time is displayed exactly as stored in the database
 * without any timezone conversions, as requested by the user ("no timezone games").
 * @param date - The date to format
 * @param format - Optional format string (default: 'DD MMM YYYY, h:mm A')
 * @param locale - Optional locale (default: 'bn-bd')
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: DateInput,
  format: string = "DD MMM YYYY, h:mm A",
  locale: string = "bn-bd",
): string => {
  if (!date) return "";
  // Use .utc() to ignore local timezone shifts
  return dayjs.utc(date).locale(locale).format(format);
};

/**
 * Format a date to show just the time
 * @param date - The date to format
 * @returns Time string (e.g., '10:30 AM')
 */
export const formatTime = (
  date: DateInput,
  locale: string = "bn-bd",
): string => {
  return formatDate(date, "h:mm A", locale);
};

/**
 * Calculate duration between two dates
 * @param start - Start date
 * @param end - End date
 * @returns Duration object
 */
export const getDuration = (start: DateInput, end: DateInput) => {
  const startDate = dayjs.utc(start);
  const endDate = dayjs.utc(end);
  return dayjs.duration(endDate.diff(startDate));
};

/**
 * Format duration between two dates in a human-readable way (e.g., "2h 30m 15s" or "45m 10s")
 * Handles both ISO and SQL format date strings.
 * @param start - Start date/time
 * @param end - End date/time
 * @returns Formatted duration string
 */
export const formatDuration = (start: DateInput, end: DateInput): string => {
  if (!start || !end) return "N/A";

  // Use .utc() for consistent duration calculation regardless of local timezone
  let startTime = dayjs.utc(start);
  let endTime = dayjs.utc(end);

  // If the string is like "YYYY-MM-DD HH:mm:ss" without T/Z (SQL format), treat as UTC
  if (
    typeof start === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(start)
  ) {
    startTime = dayjs.utc(start, "YYYY-MM-DD HH:mm:ss");
  }
  if (
    typeof end === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(end)
  ) {
    endTime = dayjs.utc(end, "YYYY-MM-DD HH:mm:ss");
  }

  const diffInMs = endTime.diff(startTime);
  if (diffInMs < 0) return "N/A";

  const duration = dayjs.duration(diffInMs);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

/**
 * Get relative time from now (e.g., "in 2 hours", "3 days ago")
 * @param date - Target date
 * @param locale - Optional locale (default: 'bn-bd')
 * @returns Relative time string
 */
export const getRelativeTime = (
  date: DateInput,
  locale: string = "bn-bd",
): string => {
  if (!date) return "";
  // Compare UTC time with UTC now
  return dayjs.utc(date).locale(locale).from(dayjs.utc());
};

/**
 * Check if the current time is between start and end dates
 * @param start - Start date
 * @param end - End date
 * @returns boolean
 */
export const isNowBetween = (start: DateInput, end: DateInput): boolean => {
  if (!start || !end) return false;
  // Use UTC now vs UTC range
  return dayjs.utc().isBetween(dayjs.utc(start), dayjs.utc(end), null, "[]"); // [] includes start and end
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: DateInput): boolean => {
  return dayjs.utc(date).isBefore(dayjs.utc());
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: DateInput): boolean => {
  return dayjs.utc(date).isAfter(dayjs.utc());
};

/**
 * Get current local time (ISO string)
 */
export const getNowLocal = (): string => {
  return dayjs.utc().format();
};

/**
 * Parse a date string
 */
export const parseLocalDate = (date: DateInput) => {
  return dayjs.utc(date);
};

// Re-export dayjs for direct use if needed
export default dayjs;
