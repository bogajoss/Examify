<?php
// Timezone setting removed
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }
$id = $_GET['id'] ?? '';
$stmt = $pdo->prepare("SELECT * FROM questions WHERE id = ?");
$stmt->execute([$id]);
$question = $stmt->fetch();

if ($question) {
    echo json_encode(['success' => true, 'data' => attachImageUrls($question)]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Question not found']);
}
?>
