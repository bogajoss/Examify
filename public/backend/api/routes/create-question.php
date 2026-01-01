<?php
defined('API_ACCESS') OR exit('Unauthorized');

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

// Required fields
$file_id = $input['file_id'] ?? '';
$exam_id = $input['exam_id'] ?? '';
$question_text = $input['question_text'] ?? '';

if (empty($question_text)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required field: question_text']);
    exit;
}

try {
    // If file_id is missing or "default", try to find it from exam or create a new one
    if (empty($file_id) || $file_id === 'default') {
        if (!empty($exam_id)) {
            // Try to get file_id from exam
            $stmt = $pdo->prepare("SELECT file_id, name FROM exams WHERE id = ?");
            $stmt->execute([$exam_id]);
            $exam = $stmt->fetch();
            if ($exam && !empty($exam['file_id'])) {
                $file_id = $exam['file_id'];
            } else {
                // Create a new file for this exam
                $file_id = uuidv4();
                $display_name = ($exam['name'] ?? 'Exam') . " Questions";
                $stmt = $pdo->prepare("INSERT INTO files (id, original_filename, display_name, uploaded_at, total_questions) VALUES (?, ?, ?, NOW(), 0)");
                $stmt->execute([$file_id, 'exam_questions.csv', $display_name]);
                
                // Update exam with this file_id
                if ($exam) {
                    $stmt = $pdo->prepare("UPDATE exams SET file_id = ? WHERE id = ?");
                    $stmt->execute([$file_id, $exam_id]);
                }
            }
        } else {
            // No exam_id and no file_id, try to find any file or fail
            $stmt = $pdo->query("SELECT id FROM files LIMIT 1");
            $file = $stmt->fetch();
            if ($file) {
                $file_id = $file['id'];
            } else {
                // Create a default file
                $file_id = uuidv4();
                $stmt = $pdo->prepare("INSERT INTO files (id, original_filename, display_name, uploaded_at, total_questions) VALUES (?, ?, ?, NOW(), 0)");
                $stmt->execute([$file_id, 'default.csv', 'Default Question Bank']);
            }
        }
    }

    // Optional fields with defaults
    $option1 = $input['option1'] ?? '';
    $option2 = $input['option2'] ?? '';
    $option3 = $input['option3'] ?? '';
    $option4 = $input['option4'] ?? '';
    $option5 = $input['option5'] ?? '';
    $answer = $input['answer'] ?? '';
    $explanation = $input['explanation'] ?? '';
    $subject = $input['subject'] ?? null;
    $paper = $input['paper'] ?? null;
    $chapter = $input['chapter'] ?? null;
    $highlight = $input['highlight'] ?? null;
    $type = $input['type'] ?? 0;
    $order_index = $input['order_index'] ?? 0;

    // Generate new UUID for the question
    $question_id = uuidv4();

    // Handle image uploads (Store Base64 directly in DB as requested, similar to batches)
    $question_image = $input['question_image'] ?? null;
    $explanation_image = $input['explanation_image'] ?? null;

    // Fallback to file uploads if provided via multipart/form-data (convert to base64 if needed or store as is)
    // But for now, let's stick to the base64 approach the user wants
    if (isset($_FILES['question_image']) && $_FILES['question_image']['error'] === UPLOAD_ERR_OK) {
        $fileData = file_get_contents($_FILES['question_image']['tmp_name']);
        $mime = $_FILES['question_image']['type'];
        $question_image = 'data:' . $mime . ';base64,' . base64_encode($fileData);
    }
    if (isset($_FILES['explanation_image']) && $_FILES['explanation_image']['error'] === UPLOAD_ERR_OK) {
        $fileData = file_get_contents($_FILES['explanation_image']['tmp_name']);
        $mime = $_FILES['explanation_image']['type'];
        $explanation_image = 'data:' . $mime . ';base64,' . base64_encode($fileData);
    }

    $sql = "INSERT INTO questions (id, file_id, question_text, option1, option2, option3, option4, option5, answer, explanation, question_image, explanation_image, subject, paper, chapter, highlight, type, order_index) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        $question_id, $file_id, $question_text, $option1, $option2, $option3, $option4, $option5,
        $answer, $explanation, $question_image, $explanation_image, $subject, $paper, $chapter, $highlight, $type, $order_index
    ]);

    if ($result) {
        // Update total_questions count in files table
        $update_count_sql = "UPDATE files SET total_questions = (SELECT COUNT(*) FROM questions WHERE file_id = ?) WHERE id = ?";
        $update_stmt = $pdo->prepare($update_count_sql);
        $update_stmt->execute([$file_id, $file_id]);

        // If exam_id is provided, link question to exam
        if (!empty($exam_id)) {
            $stmt = $pdo->prepare("INSERT INTO exam_questions (id, exam_id, question_id, order_index) VALUES (?, ?, ?, ?)");
            $stmt->execute([uuidv4(), $exam_id, $question_id, $order_index]);
        }

        $new_question = [
            'id' => $question_id,
            'file_id' => $file_id,
            'question_text' => $question_text,
            'option1' => $option1,
            'option2' => $option2,
            'option3' => $option3,
            'option4' => $option4,
            'option5' => $option5,
            'answer' => $answer,
            'explanation' => $explanation,
            'question_image' => $question_image,
            'explanation_image' => $explanation_image,
            'type' => $type,
            'order_index' => $order_index
        ];
        
        $new_question = attachImageUrls($new_question);
        
        // Remove large base64 data from response to prevent payload issues
        // The frontend already has the image or can use the _url version
        unset($new_question['question_image']);
        unset($new_question['explanation_image']);
        
        echo json_encode(['success' => true, 'message' => 'Question created successfully', 'data' => $new_question]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create question']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>