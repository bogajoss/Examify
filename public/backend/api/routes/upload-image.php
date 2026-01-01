<?php
// Timezone setting removed
if (!defined('API_ACCESS')) { http_response_code(403); exit('Unauthorized'); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    if (!isset($_FILES['image'])) {
        throw new RuntimeException('No image file provided');
    }

    // uploadImageFromInput is available because index.php includes image_upload.php
    $image_filename = uploadImageFromInput('image');
    
    if (!$image_filename) {
        throw new RuntimeException('No image was uploaded');
    }

    $image_url = getUploadedImageUrl($image_filename);

    echo json_encode([
        'success' => true,
        'filename' => $image_filename,
        'url' => $image_url,
        'message' => 'Image uploaded successfully'
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
