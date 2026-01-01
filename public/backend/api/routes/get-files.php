<?php
// Timezone setting removed
defined('API_ACCESS') OR exit('Unauthorized');
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$search = $_GET['search'] ?? '';

$pagination = "";
if ($limit > 0) {
    $pagination = " LIMIT $limit OFFSET $offset";
}

$query = "SELECT id, original_filename, display_name, uploaded_at, total_questions FROM files WHERE is_bank = 1";
$params = [];

if ($search) {
    $query .= " AND (display_name LIKE ? OR original_filename LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$query .= " ORDER BY uploaded_at DESC" . $pagination;

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$files = $stmt->fetchAll();

echo json_encode(['success' => true, 'data' => $files]);
?>