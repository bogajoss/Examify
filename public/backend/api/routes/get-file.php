<?php
// Timezone setting removed
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }
$id = $_GET['id'] ?? '';
$stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
$stmt->execute([$id]);
$file = $stmt->fetch();

if ($file) {
    echo json_encode(['success' => true, 'data' => $file]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
}
?>
