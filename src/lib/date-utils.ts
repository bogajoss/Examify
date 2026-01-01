import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/bn-bd";

// Extend dayjs with plugins
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// Set default locale to Bangla (Bangladesh) if the app is primarily in Bangla
// dayjs.locale('bn-bd');

export type DateInput = string | number | Date | dayjs.Dayjs | null | undefined;

/**
 * Format a date to a standard readable string.
 * Uses 'bn-bd' locale for localized output if specified, otherwise English.
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
  return dayjs(date).locale(locale).format(format);
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
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  return dayjs.duration(endDate.diff(startDate));
};

/**
 * Format duration in a human-readable way (e.g., "2h 30m" or "45m")
 * @param minutes - Duration in minutes
 * @returns Formatted string
 */
export const formatDuration = (minutes: number): string => {
  const dur = dayjs.duration(minutes, "minutes");
  const hours = Math.floor(dur.asHours());
  const mins = dur.minutes();

  if (hours > 0) {
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
  }
  return `${mins}m`;
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
  return dayjs(date).locale(locale).fromNow();
};

/**
 * Check if the current time is between start and end dates
 * @param start - Start date
 * @param end - End date
 * @returns boolean
 */
export const isNowBetween = (start: DateInput, end: DateInput): boolean => {
  if (!start || !end) return false;
  return dayjs().isBetween(start, end, null, "[]"); // [] includes start and end
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: DateInput): boolean => {
  return dayjs(date).isBefore(dayjs());
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: DateInput): boolean => {
  return dayjs(date).isAfter(dayjs());
};

/**
 * Get current local time (ISO string)
 */
export const getNowLocal = (): string => {
  return dayjs().format();
};

/**
 * Parse a date string
 */
export const parseLocalDate = (date: DateInput) => {
  return dayjs(date);
};

// Re-export dayjs for direct use if needed
export default dayjs;
