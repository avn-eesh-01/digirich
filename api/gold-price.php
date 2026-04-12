<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

header('Content-Type: application/json');

http_response_code(501);

echo json_encode([
    'ok' => false,
    'message' => 'Gold price proxy not configured yet.'
]);
