<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/db.php';

echo "Checking API Tokens...\n";

try {
    $stmt = $pdo->query("SELECT * FROM api_tokens");
    $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($tokens)) {
        echo "No tokens found in api_tokens table.\n";
    } else {
        echo "Found tokens:\n";
        print_r($tokens);
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

