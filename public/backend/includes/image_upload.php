<?php

function ensureUploadDirExists(string $dir = IMAGE_UPLOAD_DIR): void
{
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

function getImageExtensionFromMime(string $mime): string
{
    if ($mime === 'image/jpeg') {
        return 'jpg';
    }

    if ($mime === 'image/png') {
        return 'png';
    }

    return 'bin';
}

function storeUploadedImage(array $file): string
{
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('No valid uploaded file found.');
    }

    if ($file['size'] > MAX_IMAGE_UPLOAD_BYTES) {
        throw new RuntimeException('Image must be 100 KB or smaller.');
    }

    $imageInfo = getimagesize($file['tmp_name']);
    if (!$imageInfo || !in_array($imageInfo['mime'], ALLOWED_IMAGE_MIME_TYPES, true)) {
        throw new RuntimeException('Only JPEG and PNG images are supported.');
    }

    ensureUploadDirExists(IMAGE_UPLOAD_DIR);

    $extension = getImageExtensionFromMime($imageInfo['mime']);
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination = IMAGE_UPLOAD_DIR . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Unable to save the uploaded image.');
    }

    return $filename;
}

function uploadImageFromInput(string $fieldName): ?string
{
    if (!isset($_FILES[$fieldName])) {
        return null;
    }

    $file = $_FILES[$fieldName];
    if ($file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Image upload failed (error code ' . $file['error'] . ').');
    }

    return storeUploadedImage($file);
}

function uploadImageFromBase64(?string $base64Data): ?string
{
    if (empty($base64Data)) {
        return null;
    }

    // Check if it's already a filename (not base64)
    if (!str_starts_with($base64Data, 'data:image/')) {
        return $base64Data;
    }

    // Check if it's a data URI
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
        $data = substr($base64Data, strpos($base64Data, ',') + 1);
        $type = strtolower($type[1]); // jpg, png, gif

        if (!in_array($type, ['jpg', 'jpeg', 'png'])) {
            throw new RuntimeException('Invalid image type: ' . $type);
        }

        $data = base64_decode($data);

        if ($data === false) {
            throw new RuntimeException('base64_decode failed');
        }
    } else {
        return null;
    }

    if (strlen($data) > MAX_IMAGE_UPLOAD_BYTES) {
        throw new RuntimeException('Image must be 100 KB or smaller.');
    }

    ensureUploadDirExists(IMAGE_UPLOAD_DIR);

    $extension = $type === 'jpeg' ? 'jpg' : $type;
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination = IMAGE_UPLOAD_DIR . '/' . $filename;

    if (file_put_contents($destination, $data) === false) {
        throw new RuntimeException('Unable to save the uploaded image.');
    }

    return $filename;
}

function deleteUploadedImage(?string $filename): void
{
    if (!$filename) {
        return;
    }

    $sanitized = basename($filename);
    $path = IMAGE_UPLOAD_DIR . '/' . $sanitized;
    if (file_exists($path)) {
        @unlink($path);
    }
}

function manageImageUpload(string $fieldName, ?string $existingFilename = null, bool $removeExisting = false): ?string
{
    $newFilename = uploadImageFromInput($fieldName);
    if ($newFilename !== null) {
        if ($existingFilename) {
            deleteUploadedImage($existingFilename);
        }
        return $newFilename;
    }

    if ($removeExisting && $existingFilename) {
        deleteUploadedImage($existingFilename);
        return null;
    }

    return $existingFilename;
}

function getUploadedImageUrl(?string $filename): ?string
{
    if (!$filename) {
        return null;
    }

    $relativePath = '/' . ltrim(rtrim(IMAGE_UPLOAD_URL, '/') . '/' . ltrim($filename, '/'), '/');
    return buildFullUrl($relativePath);
}

function buildFullUrl(string $path): string
{
    $host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $port = $_SERVER['SERVER_PORT'] ?? null;
    $scheme = $https || $port === '443' ? 'https' : 'http';
    return $scheme . '://' . $host . '/' . ltrim($path, '/');
}
