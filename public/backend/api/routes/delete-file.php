<?php
defined('API_ACCESS') OR exit('Unauthorized');

// Set timezone to local for consistent date handling
// Timezone setting removed

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Get input data (JSON or Form)
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$file_id = $input['file_id'] ?? '';

if (empty($file_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing File ID']);
    exit;
}

try {
    $pdo->beginTransaction();

    // First, get all questions for this file to delete their images
    $question_stmt = $pdo->prepare("SELECT question_image, explanation_image FROM questions WHERE file_id = ?");
    $question_stmt->execute([$file_id]);
    $questions = $question_stmt->fetchAll();

    // Delete all associated images
    foreach ($questions as $q) {
        if ($q['question_image']) {
            deleteUploadedImage($q['question_image']);
        }
        if ($q['explanation_image']) {
            deleteUploadedImage($q['explanation_image']);
        }
    }

    // Delete all questions for this file
    $delete_questions_sql = "DELETE FROM questions WHERE file_id = ?";
    $delete_questions_stmt = $pdo->prepare($delete_questions_sql);
    $delete_questions_stmt->execute([$file_id]);

    // Now delete the file record
    $delete_file_sql = "DELETE FROM files WHERE id = ?";
    $stmt = $pdo->prepare($delete_file_sql);
    $result = $stmt->execute([$file_id]);

    if ($result && $stmt->rowCount() > 0) {
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'File and all associated questions deleted successfully']);
    } else {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>