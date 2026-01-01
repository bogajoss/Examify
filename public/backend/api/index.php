<?php
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/image_upload.php';
require_once '../includes/csv_parser.php';
require_once '../includes/security.php';
require_once '../includes/uuid.php';

header('Content-Type: application/json; charset=utf-8');

define('API_ACCESS', true);

// 1. Validate Token
$token = $_GET['token'] ?? '';
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Missing API Token']);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM api_tokens WHERE token = ? AND is_active = 1");
$stmt->execute([$token]);
$api_user = $stmt->fetch();

if (!$api_user) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid API Token']);
    exit;
}

// Set global admin flag if token is admin
define('IS_ADMIN_REQUEST', (bool)($api_user['is_admin'] ?? false));

// 2. Route Request
$route = $_GET['route'] ?? '';

$routes = [
    'files' => 'routes/get-files.php',
    'file' => 'routes/get-file.php',
    'questions' => 'routes/get-questions.php',
    'question' => 'routes/get-question.php',
    'create-question' => 'routes/create-question.php',
    'update-question' => 'routes/update-question.php',
    'delete-question' => 'routes/delete-question.php',
    'upload-csv' => 'routes/upload-csv.php',
    'upload-image' => 'routes/upload-image.php',
    'delete-file' => 'routes/delete-file.php',
    'create-file' => 'routes/create-file.php',
    'update-file' => 'routes/update-file.php',
    'stats' => 'routes/stats.php'
];

function attachImageUrls(array $question): array
{
    $questionImage = $question['question_image'] ?? null;
    $explanationImage = $question['explanation_image'] ?? null;

    // If it starts with data: its already a base64 URL
    // If it starts with http: its already a full URL
    if ($questionImage && (substr($questionImage, 0, 5) === 'data:' || substr($questionImage, 0, 4) === 'http')) {
        $question['question_image_url'] = $questionImage;
    } elseif ($questionImage) {
        $question['question_image_url'] = getUploadedImageUrl($questionImage);
    } else {
        $question['question_image_url'] = null;
    }

    if ($explanationImage && (substr($explanationImage, 0, 5) === 'data:' || substr($explanationImage, 0, 4) === 'http')) {
        $question['explanation_image_url'] = $explanationImage;
    } elseif ($explanationImage) {
        $question['explanation_image_url'] = getUploadedImageUrl($explanationImage);
    } else {
        $question['explanation_image_url'] = null;
    }
    
    return $question;
}

if (array_key_exists($route, $routes)) {
    include $routes[$route];
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Route not found']);
}
?>
