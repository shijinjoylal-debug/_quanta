<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

// Directory
$targetDir = __DIR__ . "/images";

$response = [];
$allowed = ['jpg', 'jpeg', 'png', 'webp'];
$maxSize = 5 * 1024 * 1024; // 5MB

if (!isset($_FILES['images'])) {
    echo json_encode(["error" => "No files uploaded"]);
    exit;
}

foreach ($_FILES['images']['tmp_name'] as $index => $tmpName) {
    $name = $_FILES['images']['name'][$index];
    $size = $_FILES['images']['size'][$index];
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    if (!in_array($ext, $allowed)) continue;
    if ($size > $maxSize) continue;

    $newName = time() . "_" . rand(1000,9999) . "." . $ext;
    $dest = $targetDir . $newName;

    if (move_uploaded_file($tmpName, $dest)) {
        $response[] = "/images" . $newName;
    }
}

echo json_encode($response);
?>
