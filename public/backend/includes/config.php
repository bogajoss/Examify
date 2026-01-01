<?php
// Database Configuration - Hardcoded
define('DB_HOST', 'localhost');
define('DB_NAME', 'zxtfmwrs_mnr_exam');
define('DB_USER', 'zxtfmwrs_mnr_exam');
define('DB_PASS', 'mnr_exam');
define('DB_CHARSET', 'utf8mb4');

// App Configuration
define('APP_NAME', 'Universal Question Bank Manager');
define('BASE_URL', '/api');  // Hardcoded instead of getenv('BACKEND_BASE_URL')

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
define('DEBUG_MODE', false);  // Hardcoded instead of getenv('DEBUG_MODE')
error_reporting(DEBUG_MODE ? E_ALL : 0);
ini_set('display_errors', DEBUG_MODE ? 1 : 0);
?>