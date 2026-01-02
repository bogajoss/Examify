<?php
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }

// Include date utilities for proper local time handling
require_once __DIR__ . '/../../../backend/lib/date-utils.php';

$file_id = $_GET['file_id'] ?? '';
$exam_id = $_GET['exam_id'] ?? '';
$ids_param = $_GET['ids'] ?? '';
$search = $_GET['search'] ?? '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

// Handle POST request body (JSON)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        if (isset($input['ids'])) $ids_param = $input['ids'];
        if (isset($input['file_id'])) $file_id = $input['file_id'];
        if (isset($input['exam_id'])) $exam_id = $input['exam_id'];
        if (isset($input['search'])) $search = $input['search'];
        if (isset($input['limit'])) $limit = (int)$input['limit'];
        if (isset($input['offset'])) $offset = (int)$input['offset'];
    }
}

$pagination = "";
if ($limit > 0) {
    $pagination = " LIMIT $limit OFFSET $offset";
}

$questions = [];

if ($ids_param) {
    // If ids is an array (from JSON), use it directly, otherwise explode string
    $ids = is_array($ids_param) ? $ids_param : explode(',', $ids_param);
    $ids = array_filter($ids); // Remove empty values
    if (!empty($ids)) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $query = "SELECT * FROM questions WHERE id IN ($placeholders)";
        $params = $ids;
        
        if ($search) {
            $query .= " AND (question_text LIKE ? OR explanation LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $query .= " ORDER BY FIELD(id, $placeholders)" . $pagination;
        // We need to double the IDs for the FIELD function to maintain order
        $params = array_merge($params, $ids);
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $questions = $stmt->fetchAll();
    }
} elseif ($exam_id) {
    // 1. Check Exam Timing using local time validation (skip for admins)
    if (!IS_ADMIN_REQUEST) {
        $timingStmt = $pdo->prepare("SELECT start_at, is_practice FROM exams WHERE id = ?");
        $timingStmt->execute([$exam_id]);
        $examTiming = $timingStmt->fetch();

        if ($examTiming && !$examTiming['is_practice'] && $examTiming['start_at']) {
            $timeValidation = validateExamTimeWindow($examTiming['start_at'], null);
            if (!$timeValidation['isAllowed'] && $timeValidation['reason'] === 'exam_not_started') {
                 http_response_code(403);
                 echo json_encode(['success' => false, 'message' => 'Exam has not started yet.']);
                 exit;
            }
        }
    }

    $query = "SELECT q.*, NULL as question_marks FROM questions q JOIN exam_questions eq ON q.id = eq.question_id WHERE eq.exam_id = ?";
    $params = [$exam_id];
    
    if ($search) {
        $query .= " AND (q.question_text LIKE ? OR q.explanation LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    $query .= " ORDER BY eq.order_index ASC" . $pagination;
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $questions = $stmt->fetchAll();

    if (empty($questions) && $offset == 0) {
        // Fallback: use file_id from exam table
        $stmt = $pdo->prepare("SELECT file_id FROM exams WHERE id = ?");
        $stmt->execute([$exam_id]);
        $exam = $stmt->fetch();
        if ($exam && $exam['file_id']) {
            $query = "SELECT * FROM questions WHERE file_id = ?";
            $params = [$exam['file_id']];
            if ($search) {
                $query .= " AND (question_text LIKE ? OR explanation LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            $query .= " ORDER BY order_index ASC" . $pagination;
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $questions = $stmt->fetchAll();
        }
    }
    
    // 2. Second Fallback: Use file_id from request if exam lookup failed or returned no questions
    if (empty($questions) && $offset == 0 && isset($_GET['file_id']) && !empty($_GET['file_id'])) {
        $fallback_file_id = $_GET['file_id'];
        $query = "SELECT * FROM questions WHERE file_id = ?";
        $params = [$fallback_file_id];
        if ($search) {
            $query .= " AND (question_text LIKE ? OR explanation LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        $query .= " ORDER BY order_index ASC" . $pagination;
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $questions = $stmt->fetchAll();
    }
} elseif ($file_id) {
    $query = "SELECT * FROM questions WHERE file_id = ?";
    $params = [$file_id];
    if ($search) {
        $query .= " AND (question_text LIKE ? OR explanation LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    $query .= " ORDER BY order_index ASC" . $pagination;
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $questions = $stmt->fetchAll();
} else {
    $query = "SELECT * FROM questions WHERE 1=1";
    $params = [];
    if ($search) {
        $query .= " AND (question_text LIKE ? OR explanation LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    $query .= " ORDER BY created_at DESC" . $pagination;
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $questions = $stmt->fetchAll();
}

$questions = array_map('attachImageUrls', $questions);

echo json_encode(['success' => true, 'data' => $questions]);
?>