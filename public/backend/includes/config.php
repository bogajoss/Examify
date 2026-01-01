<?php
// Load environment variables if .env exists (simple parser for dev)
if (file_exists(__DIR__ . '/../../.env')) {
    $lines = file(__DIR__ . '/../../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Database Configuration
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'zxtfmwrs_mnr_exam');
define('DB_USER', getenv('DB_USER') ?: 'zxtfmwrs_mnr_exam');
define('DB_PASS', getenv('DB_PASS') ?: 'mnr_exam');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

// App Configuration
define('APP_NAME', 'Universal Question Bank Manager');
define('BASE_URL', getenv('BACKEND_BASE_URL') ?: '/api');

define('APP_PUBLIC_URL', ''); 
define('UPLOADS_DIR', __DIR__ . '/../uploads');
define('IMAGE_UPLOAD_SUBDIR', 'images');
define('IMAGE_UPLOAD_DIR', UPLOADS_DIR . '/' . IMAGE_UPLOAD_SUBDIR);
define('UPLOADS_URL_PATH', rtrim(APP_PUBLIC_URL, '/') . '/uploads');
define('IMAGE_UPLOAD_URL', rtrim(UPLOADS_URL_PATH, '/') . '/' . IMAGE_UPLOAD_SUBDIR);
define('MAX_IMAGE_UPLOAD_BYTES', 1024 * 1024); // 1 MB
define('ALLOWED_IMAGE_MIME_TYPES', [
	'image/jpeg',
	'image/png'
]);

// Error Reporting
// In production, these should be 0
define('DEBUG_MODE', getenv('DEBUG_MODE') === 'true');
error_reporting(DEBUG_MODE ? E_ALL : 0);
ini_set('display_errors', DEBUG_MODE ? 1 : 0);
?>