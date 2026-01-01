<?php
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }

// Set timezone to local for consistent date handling
// Timezone setting removed

// Define configuration constants
define('MAX_CSV_SIZE', 5 * 1024 * 1024); // 5MB

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No CSV file uploaded or upload error']);
    exit;
}

$csv_file = $_FILES['csv_file'];

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimetype = finfo_file($finfo, $csv_file['tmp_name']);
finfo_close($finfo);

if ($mimetype !== 'text/csv' && $mimetype !== 'application/csv' && $mimetype !== 'text/plain') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only CSV files are allowed.']);
    exit;
}

// Validate file size
if ($csv_file['size'] > MAX_CSV_SIZE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File too large. Maximum size is ' . (MAX_CSV_SIZE / 1024 / 1024) . 'MB.']);
    exit;
}

// Move uploaded file to a temporary location
$temp_file = tempnam(sys_get_temp_dir(), 'csv_upload_');
if (!move_uploaded_file($csv_file['tmp_name'], $temp_file)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save uploaded file']);
    exit;
}

try {
    // Parse the CSV
    $questions = parseCSV($temp_file);
    
    if (empty($questions)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No valid questions found in CSV file']);
        unlink($temp_file);
        exit;
    }

    $pdo->beginTransaction();

    // Create a file record
    $file_id = uuidv4();
    $original_filename = $csv_file['name'];
    $is_bank = isset($_POST['is_bank']) ? (int)$_POST['is_bank'] : 1;
    
    // Insert file record
    $stmt = $pdo->prepare("INSERT INTO files (id, original_filename, display_name, uploaded_at, total_questions, is_bank) VALUES (?, ?, ?, NOW(), ?, ?)");
    $stmt->execute([$file_id, $original_filename, $original_filename, count($questions), $is_bank]);
    
    // Insert all questions
    $question_stmt = $pdo->prepare("INSERT INTO questions (id, file_id, question_text, option1, option2, option3, option4, option5, answer, explanation, type, subject, paper, chapter, highlight, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $inserted_count = 0;
    foreach ($questions as $index => $q) {
        $question_id = uuidv4();
        $question_stmt->execute([
            $question_id,
            $file_id,
            $q['question_text'],
            $q['option1'],
            $q['option2'],
            $q['option3'],
            $q['option4'],
            $q['option5'],
            $q['answer'],
            $q['explanation'],
            $q['type'],
            $q['subject'] ?? null,
            $q['paper'] ?? null,
            $q['chapter'] ?? null,
            $q['highlight'] ?? null,
            $index
        ]);
        $inserted_count++;
    }
    
    // Update total questions count (though we already set it in file record, this confirms actual insertions if any filtered out? No, but good practice if logic changes)
    $update_count_sql = "UPDATE files SET total_questions = ? WHERE id = ?";
    $update_stmt = $pdo->prepare($update_count_sql);
    $update_stmt->execute([$inserted_count, $file_id]);
    
    $pdo->commit();
    unlink($temp_file);
    
    echo json_encode([
        'success' => true,
        'message' => "$inserted_count questions imported successfully",
        'file_id' => $file_id,
        'total_questions' => $inserted_count
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unlink($temp_file);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error processing CSV: ' . $e->getMessage()]);
}
?>