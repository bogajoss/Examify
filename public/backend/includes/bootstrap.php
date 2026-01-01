<?php
// Enable GZIP compression if available
if (!in_array('ob_gzhandler', ob_list_handlers())) {
    ob_start('ob_gzhandler');
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/uuid.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/csv_parser.php';
require_once __DIR__ . '/image_upload.php';
require_once __DIR__ . '/cache.php';
?>

