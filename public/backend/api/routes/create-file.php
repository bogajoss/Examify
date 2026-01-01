<?php
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }

// Set timezone to local for consistent date handling
// Timezone setting removed

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Get input data (JSON or Form)
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$original_filename = $input['original_filename'] ?? '';
$display_name = $input['display_name'] ?? $original_filename;

if (empty($original_filename)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing original_filename']);
    exit;
}

$file_id = uuidv4();

try {
    $stmt = $pdo->prepare("INSERT INTO files (id, original_filename, display_name, uploaded_at, total_questions) VALUES (?, ?, ?, NOW(), 0)");
    $result = $stmt->execute([$file_id, $original_filename, $display_name]);

    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'File record created successfully',
            'file_id' => $file_id,
            'file' => [
                'id' => $file_id,
                'original_filename' => $original_filename,
                'display_name' => $display_name,
                'uploaded_at' => getNowLocalMysql(),
                'total_questions' => 0
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create file record']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>