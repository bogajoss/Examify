import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs, { formatDate } from "@/lib/date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to safely parse Date from DB string
export const safeParseDate = (
  dateStr: string | Date | null | undefined,
): Date | null => {
  if (!dateStr) return null;
  const d = dayjs(dateStr);
  return d.isValid() ? d.toDate() : null;
};

// Helper to get current local time
export function getCurrentLocalTime() {
  return dayjs().toDate();
}

// Helper to combine date and time components into plain datetime string (YYYY-MM-DD HH:MM:SS)
// No timezone conversion - just direct time as entered by user
export const combineLocalDateTime = (
  dateInput: Date | string | undefined,
  hour: string,
  minute: string,
  period: "AM" | "PM",
): string | null => {
  if (!dateInput || !hour || !minute || !period) return null;

  let h24 = parseInt(hour, 10);
  if (period === "PM" && h24 !== 12) h24 += 12;
  if (period === "AM" && h24 === 12) h24 = 0;

  // Convert date to string format "YYYY-MM-DD"
  let dateStr: string;
  if (typeof dateInput === "string") {
    dateStr = dateInput;
  } else {
    // If it's a Date object, just use its date parts (no timezone conversion)
    dateStr = dayjs(dateInput).format("YYYY-MM-DD");
  }

  const timeStr = `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  // Return plain datetime string - no ISO, no timezone conversion
  return `${dateStr} ${timeStr}`;
};

// Helper to parse a plain datetime string back to time components
// No timezone conversion - just extract time as stored
export const parseLocalDateTime = (datetimeString: string) => {
  // Parse plain datetime string (YYYY-MM-DD HH:MM:SS or ISO format)
  const d = dayjs(datetimeString);

  if (!d.isValid()) {
    return {
      dateStr: "",
      date: new Date(),
      hour: "12",
      minute: "00",
      period: "AM" as const,
    };
  }

  const hour = d.hour();
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const dateStr = d.format("YYYY-MM-DD");

  return {
    dateStr: dateStr,
    date: dayjs(dateStr).toDate(),
    hour: String(hour12).padStart(2, "0"),
    minute: String(d.minute()).padStart(2, "0"),
    period: period as "AM" | "PM",
  };
};

/**
 * Validate if current device time is within exam time window
 * Supports both ISO 8601 and MySQL (YYYY-MM-DD HH:MM:SS) datetime formats
 * All times are evaluated using the device's local time
 * @param startTime - Exam start time (ISO string, MySQL format, or Date)
 * @param endTime - Exam end time (ISO string, MySQL format, or Date)
 * @returns { isAllowed: boolean, reason?: string }
 */
export const validateExamTime = (
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined,
): { isAllowed: boolean; reason?: string } => {
  try {
    // Current time in local time
    const now = dayjs();

    // If no time restrictions, allow
    if (!startTime && !endTime) {
      return { isAllowed: true };
    }

    // Parse start time - handle both ISO and MySQL format
    let start: dayjs.Dayjs | null = null;
    if (startTime) {
      const startStr = String(startTime);
      // If it looks like MySQL format (YYYY-MM-DD HH:MM:SS), parse as local time
      if (startStr.includes(" ") && !startStr.includes("T")) {
        start = dayjs(startStr, "YYYY-MM-DD HH:mm:ss");
      } else {
        // ISO format or other - parse and convert to local
        start = dayjs(startStr);
      }
    }

    // Parse end time - handle both ISO and MySQL format
    let end: dayjs.Dayjs | null = null;
    if (endTime) {
      const endStr = String(endTime);
      // If it looks like MySQL format (YYYY-MM-DD HH:MM:SS), parse as local time
      if (endStr.includes(" ") && !endStr.includes("T")) {
        end = dayjs(endStr, "YYYY-MM-DD HH:mm:ss");
      } else {
        // ISO format or other - parse and convert to local
        end = dayjs(endStr);
      }
    }

    // Check if current time is before exam start
    if (start && start.isValid() && now.isBefore(start)) {
      return {
        isAllowed: false,
        reason: `exam_not_started`,
      };
    }

    // Check if current time is after exam end
    if (end && end.isValid() && now.isAfter(end)) {
      return {
        isAllowed: false,
        reason: `exam_ended`,
      };
    }

    // Current time is within the allowed window
    return { isAllowed: true };
  } catch (error) {
    console.error("Error validating exam time:", error);
    return { isAllowed: false, reason: `invalid_time_data` };
  }
};

/**
 * Get formatted time strings for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatExamDateTime = (date: Date | string | null | undefined) => {
  if (!date) return null;
  return formatDate(date, "DD MMMM YYYY, hh:mm:ss A");
};

/**
 * Masks mobile numbers, showing only the last 4 digits
 * If the input is 8+ digits, it's considered a phone number and masked
 * @param input - The input string (could be roll number or phone number)
 * @returns Masked string with only last 4 digits visible, or original if not a phone number
 */
export const maskMobileNumber = (input: string): string => {
  if (!input) return input;

  // Extract only digit characters (both ASCII and Bengali digits)
  // ASCII digits: 0-9 (0x30-0x39), Bengali digits: ০-৯ (0x09E6-0x09EF)
  const digitsOnly = input.replace(/[^\d\u09E6-\u09EF]/g, "");

  // Count total number of digits (converting Bengali to ASCII for counting)
  const digitCount = digitsOnly.replace(/[\u09E6-\u09EF]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x09e6 + 0x30); // Convert Bengali to ASCII for counting
  }).length;

  // If it's 8 or more digits, consider it a phone number and mask it
  if (digitCount >= 8) {
    // Extract the last 4 digits from the original digitsOnly string
    const lastFourDigits = digitsOnly.slice(-4);

    // Create the masked part by replacing all but the last 4 digits with '*'
    const digitsToMask = Math.max(0, digitCount - 4);
    const maskedPart = "*".repeat(digitsToMask);

    return maskedPart + lastFourDigits;
  }

  // If less than 8 digits, return as is (likely a roll number)
  return input;
};
