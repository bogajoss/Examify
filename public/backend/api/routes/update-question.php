<?php
// Timezone setting removed
defined('API_ACCESS') OR exit('Unauthorized');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    // Fields to update (including images for Base64 support)
    $allowed_fields = ['question_text', 'option1', 'option2', 'option3', 'option4', 'option5', 'answer', 'explanation', 'type', 'question_image', 'explanation_image', 'subject', 'paper', 'chapter', 'highlight'];
    $updates = [];
    $params = [];

    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            $value = $input[$field];
            // We store base64 directly in DB as requested
            $updates[] = "$field = ?";
            $params[] = $value;
        }
    }

    // Fallback: Handle traditional image file uploads if provided (convert to base64)
    if (isset($_FILES['question_image']) && $_FILES['question_image']['error'] === UPLOAD_ERR_OK) {
        $fileData = file_get_contents($_FILES['question_image']['tmp_name']);
        $mime = $_FILES['question_image']['type'];
        $updates[] = "question_image = ?";
        $params[] = 'data:' . $mime . ';base64,' . base64_encode($fileData);
    }

    if (isset($_FILES['explanation_image']) && $_FILES['explanation_image']['error'] === UPLOAD_ERR_OK) {
        $fileData = file_get_contents($_FILES['explanation_image']['tmp_name']);
        $mime = $_FILES['explanation_image']['type'];
        $updates[] = "explanation_image = ?";
        $params[] = 'data:' . $mime . ';base64,' . base64_encode($fileData);
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }

    $params[] = $id;
    $sql = "UPDATE questions SET " . implode(', ', $updates) . " WHERE id = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    // Fetch the updated question to return it
    $stmt = $pdo->prepare("SELECT * FROM questions WHERE id = ?");
    $stmt->execute([$id]);
    $question = $stmt->fetch();
    if ($question) {
        $question = attachImageUrls($question);
        // Remove large base64 data from response
        unset($question['question_image']);
        unset($question['explanation_image']);
    }
    
    echo json_encode(['success' => true, 'message' => 'Question updated', 'data' => $question]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>