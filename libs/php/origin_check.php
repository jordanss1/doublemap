<?php
// $allowedOrigins = []; 

// if (in_array($_SERVER['HTTP_HOST'], ['localhost', '127.0.0.1'])) {
//     $allowedOrigins[] = 'http://localhost:8080'; 
// }

// $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
// $referer = $_SERVER['HTTP_REFERER'] ?? null;

// $refererHost = $referer ? parse_url($referer, PHP_URL_HOST) : null;

// $validOrigin = $origin && in_array($origin, $allowedOrigins);
// $validReferer = $refererHost && in_array($refererHost, $allowedOrigins);

// if (!($validOrigin || $validReferer) && $origin !== null && $referer !== null) {
//     http_response_code(403); 
//     echo json_encode([
//         'error' => 'Invalid origin or referer', 
//         'details' => [
//             'Origin' => $origin,
//             'Referer' => $referer,
//             'Allowed Origins' => $allowedOrigins
//         ]
//     ]);
//     exit;
// }
?>