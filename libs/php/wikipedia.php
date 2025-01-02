<?php

    header('Content-Type: application/json');
    require_once dirname(__DIR__) . '/functions.php';
    require_once dirname(__DIR__) . '/error_handle.php';

    $parsedUrl = parse_url($_SERVER['REQUEST_URI']);

    if (!$parsedUrl) {
        http_response_code(401);
        echo json_encode(['data' => ['error' => 'Malformed url', 'details' => 'Please correct URL format']]);
        exit;
    }

    [$path, $queriesFormatted] = parsePathAndQueryString($parsedUrl);

    