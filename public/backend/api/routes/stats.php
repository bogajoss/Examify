<?php
// Timezone setting removed
if (!defined('API_ACCESS')) exit;

// Try to get from cache first (5 minute TTL)
$cacheKey = getCacheKey('stats');
$cachedData = APICache::get($cacheKey);

if ($cachedData !== null) {
    echo json_encode(['success' => true, 'data' => $cachedData, 'cached' => true]);
} else {
    $stmt = $pdo->query("SELECT SUM(total_questions) as count FROM files");
    $questionsCount = $stmt->fetch()['count'] ?? 0;

    $data = [
        'questionsCount' => (int)$questionsCount
    ];
    
    // Cache for 5 minutes
    APICache::set($cacheKey, $data, 300);
    
    echo json_encode(['success' => true, 'data' => $data]);
}
?>
