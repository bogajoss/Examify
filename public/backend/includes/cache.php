<?php
// Simple in-memory cache for API responses
// TTL: Time to live in seconds

class APICache {
    private static $cache = [];
    private static $ttl = [];
    
    /**
     * Get cached value
     */
    public static function get($key) {
        if (!isset(self::$cache[$key])) {
            return null;
        }
        
        // Check if expired
        if (isset(self::$ttl[$key]) && time() > self::$ttl[$key]) {
            unset(self::$cache[$key]);
            unset(self::$ttl[$key]);
            return null;
        }
        
        return self::$cache[$key];
    }
    
    /**
     * Set cache value
     * @param $key Cache key
     * @param $value Value to cache
     * @param $ttl Time to live in seconds (default: 300 = 5 minutes)
     */
    public static function set($key, $value, $ttl = 300) {
        self::$cache[$key] = $value;
        self::$ttl[$key] = time() + $ttl;
    }
    
    /**
     * Check if key exists and is not expired
     */
    public static function has($key) {
        return self::get($key) !== null;
    }
    
    /**
     * Clear specific cache key
     */
    public static function delete($key) {
        unset(self::$cache[$key]);
        unset(self::$ttl[$key]);
    }
    
    /**
     * Clear all cache
     */
    public static function flush() {
        self::$cache = [];
        self::$ttl = [];
    }
}

/**
 * Generate cache key from request parameters
 */
function getCacheKey($endpoint, $params = []) {
    $key_parts = [$endpoint];
    foreach ($params as $k => $v) {
        if ($v !== null && $v !== '') {
            $key_parts[] = $k . '=' . $v;
        }
    }
    return implode('|', $key_parts);
}
?>
