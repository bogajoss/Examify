<?php
// Timezone setting removed
defined('API_ACCESS') OR exit('Unauthorized');
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
