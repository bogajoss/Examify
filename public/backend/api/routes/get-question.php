<?php
// Timezone setting removed
defined('API_ACCESS') OR exit('Unauthorized');
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
