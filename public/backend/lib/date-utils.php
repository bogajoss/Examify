<?php
/**
 * Date/Time Utility Functions
 * Uses server's default timezone configuration
 */

/**
 * Get current time as ISO 8601 string
 * @return string ISO 8601 formatted datetime string
 */
function getNowLocal() {
    $now = new DateTime('now');
    return $now->format('c'); // ISO 8601 format
}

/**
 * Get current time as 'YYYY-MM-DD HH:MM:SS' format
 * @return string DateTime string in MySQL format
 */
function getNowLocalMysql() {
    $now = new DateTime('now');
    return $now->format('Y-m-d H:i:s');
}

/**
 * Get current date as 'YYYY-MM-DD' format
 * @return string Date string
 */
function getTodayLocal() {
    $now = new DateTime('now');
    return $now->format('Y-m-d');
}

/**
 * Parse an ISO 8601 or MySQL datetime string
 * @param string $dateString The datetime string to parse
 * @return DateTime DateTime object
 * @throws Exception If the date string cannot be parsed
 */
function parseDatetimeLocal($dateString) {
    try {
        return new DateTime($dateString);
    } catch (Exception $e) {
        throw new Exception("Invalid datetime format: $dateString");
    }
}

/**
 * Check if current time is between two datetime strings
 * @param string|null $startTime Start datetime
 * @param string|null $endTime End datetime
 * @return array ['isAllowed' => bool, 'reason' => 'exam_not_started' | 'exam_ended' | null]
 */
function validateExamTimeWindow($startTime, $endTime) {
    $now = new DateTime('now');
    
    // If no time restrictions, allow
    if (empty($startTime) && empty($endTime)) {
        return ['isAllowed' => true, 'reason' => null];
    }
    
    try {
        // Check start time
        if (!empty($startTime)) {
            $start = parseDatetimeLocal($startTime);
            if ($now < $start) {
                return ['isAllowed' => false, 'reason' => 'exam_not_started'];
            }
        }
        
        // Check end time
        if (!empty($endTime)) {
            $end = parseDatetimeLocal($endTime);
            if ($now > $end) {
                return ['isAllowed' => false, 'reason' => 'exam_ended'];
            }
        }
        
        return ['isAllowed' => true, 'reason' => null];
    } catch (Exception $e) {
        return ['isAllowed' => false, 'reason' => 'invalid_time_data'];
    }
}

/**
 * Check if current time can still submit (allows grace period)
 * @param string $endTime End datetime
 * @param int $gracePeriodSeconds Grace period in seconds (default: 5 minutes = 300)
 * @return bool True if submission is allowed
 */
function canSubmitExam($endTime, $gracePeriodSeconds = 300) {
    if (empty($endTime)) {
        return true; // No end time means no restriction
    }
    
    try {
        $now = new DateTime('now');
        $end = parseDatetimeLocal($endTime);
        
        // Add grace period to end time
        $endWithGrace = (clone $end)->modify("+{$gracePeriodSeconds} seconds");
        
        return $now <= $endWithGrace;
    } catch (Exception $e) {
        return true; // On error, be permissive
    }
}

/**
 * Calculate duration between two datetime strings in seconds
 * @param string $startTime Start datetime
 * @param string $endTime End datetime
 * @return int Duration in seconds
 */
function getDatetimeDifferenceInSeconds($startTime, $endTime) {
    try {
        $start = parseDatetimeLocal($startTime);
        $end = parseDatetimeLocal($endTime);
        
        $interval = $end->diff($start);
        return $interval->days * 86400 + $interval->h * 3600 + $interval->i * 60 + $interval->s;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Format a datetime string for display
 * @param string|null $dateString Datetime string
 * @param string $format PHP date format (default: 'Y-m-d H:i:s')
 * @return string|null Formatted string or null if invalid
 */
function formatDatetimeLocal($dateString, $format = 'Y-m-d H:i:s') {
    if (empty($dateString)) {
        return null;
    }
    
    try {
        $date = parseDatetimeLocal($dateString);
        return $date->format($format);
    } catch (Exception $e) {
        return null;
    }
}