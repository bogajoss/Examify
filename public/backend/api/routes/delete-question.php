<?php
// Timezone setting removed
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }

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

$id = $input['id'] ?? '';

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing Question ID']);
    exit;
}

try {
    $pdo->beginTransaction();

    // First, get the question to access image filenames for deletion
    $stmt = $pdo->prepare("SELECT question_image, explanation_image, file_id FROM questions WHERE id = ?");
    $stmt->execute([$id]);
    $question = $stmt->fetch();

    if (!$question) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Question not found']);
        exit;
    }

    // Delete associated images if they exist
    if ($question['question_image']) {
        deleteUploadedImage($question['question_image']);
    }
    if ($question['explanation_image']) {
        deleteUploadedImage($question['explanation_image']);
    }

    // Now delete the question
    $sql = "DELETE FROM questions WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // Update total_questions count in files table
        $file_id = $question['file_id'] ?? null;
        if ($file_id) {
            $update_count_sql = "UPDATE files SET total_questions = (SELECT COUNT(*) FROM questions WHERE file_id = ?) WHERE id = ?";
            $update_stmt = $pdo->prepare($update_count_sql);
            $update_stmt->execute([$file_id, $file_id]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Question deleted successfully']);
    } else {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete question']);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>