<?php
// File-based cache for API responses
// TTL: Time to live in seconds

class APICache {
    private static $cacheDir = __DIR__ . '/../cache';
    
    /**
     * Initialize cache directory
     */
    private static function init() {
        if (!file_exists(self::$cacheDir)) {
            mkdir(self::$cacheDir, 0755, true);
        }
    }

    /**
     * Get cached value
     */
    public static function get($key) {
        self::init();
        $filename = self::getFilename($key);
        
        if (!file_exists($filename)) {
            return null;
        }
        
        $content = @file_get_contents($filename);
        if ($content === false) {
            return null;
        }

        $data = json_decode($content, true);
        if (!$data || !isset($data['expiry']) || !isset($data['value'])) {
            @unlink($filename);
            return null;
        }
        
        // Check if expired
        if (time() > $data['expiry']) {
            @unlink($filename);
            return null;
        }
        
        return $data['value'];
    }
    
    /**
     * Set cache value
     * @param $key Cache key
     * @param $value Value to cache
     * @param $ttl Time to live in seconds (default: 300 = 5 minutes)
     */
    public static function set($key, $value, $ttl = 300) {
        self::init();
        $filename = self::getFilename($key);
        $data = [
            'expiry' => time() + $ttl,
            'value' => $value
        ];
        
        file_put_contents($filename, json_encode($data));
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
        self::init();
        $filename = self::getFilename($key);
        if (file_exists($filename)) {
            @unlink($filename);
        }
    }
    
    /**
     * Clear all cache
     */
    public static function flush() {
        self::init();
        $files = glob(self::$cacheDir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
    }

    private static function getFilename($key) {
        return self::$cacheDir . '/' . md5($key) . '.cache';
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
